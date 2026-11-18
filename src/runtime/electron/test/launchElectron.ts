import { _electron as electron, type ElectronApplication, expect, type Page, test as base } from "@playwright/test"
import type { Cookie } from "electron"
import { rm } from "node:fs/promises"
import path from "node:path"

// playwright's window list includes devtools, getAllWindows does not, so devtools is filtered out of every window list the fixture reads

/**
 * Creates a Playwright test object with an Electron app and its window wired in. The app launches on first use and closes when the test ends.
 *
 * Without arguments the page is the window the app opens at launch. Pass another prefix to waitForWindow after an action that opens a different window.
 */
export function launchElectron({
	appDir,
	userDataDir,
	serverUrl,
	useDevMode = false,
	bundlePrefix,
	env = {},
	extraArgs = [],
	windowTimeout = 30_000
}: {
	/** Points the app at serverUrl with VITE_DEV_SERVER_URL instead of at its bundlePrefix. Only works when the app leaves the windowUrl override open, so a baked production flag must be false. */
	useDevMode?: boolean | string
	/** Directory the app is launched from, becomes the electron process cwd. A module playground passes its playground dir, an app passes its repo root. */
	appDir: string
	/** Profile directory, it will be wiped before every launch. Point it somewhere gitignored. Must be within appDir for safety. */
	userDataDir: string
	/** Server the app talks to when proxying. Is used to launch electron with OVERRIDE_PUBLIC_SERVER_URL and VITE_DEV_SERVER_URL as needed. */
	serverUrl: string
	/** How long to wait for the matching window before throwing. */
	windowTimeout?: number
	/** The app's bundle url prefix, e.g. "app://bundle". Only needed in bundled mode, dev uses serverUrl. */
	bundlePrefix?: string
	/** Extra env to run the app with. */
	env?: Record<string, string>
	/** Extra args for the electron process. */
	extraArgs?: string[]
}) {
	if (!useDevMode && !bundlePrefix) {
		throw new Error("launchElectron: pass bundlePrefix, the app's bundle url prefix, or run in dev with useDevMode.")
	}
	const launchPrefix = useDevMode ? serverUrl : bundlePrefix as string
	return base.extend<{
		app: ElectronApplication
		page: Page
		/**
		 * Waits for a window whose url starts with the prefix and returns it.
		 *
			* Without arguments it waits for the launch prefix, which is the app bundle normally and the server url in dev. Pass another prefix after an action that opens a different window, such as switching user. Already open windows are checked first, then new arrivals, and navigation is awaited since the url is not set yet when the window event fires. Throws listing the urls it saw on timeout.
		 */
		waitForWindow: (prefix?: string, timeout?: number) => Promise<Page>
		/**
		 * Returns the next window the app opens, for example after switching user.
		 *
			* Unlike waitForWindow it does not match by url, it takes whatever non-first window arrives next. An event that fired before the caller asks is not missed, and it waits until only one window is listed since the app closes the old window asynchronously.
		 */
		getPageFromWindow: () => Promise<Page>
		/**
		 * Cancels the given window's session requests (http/https only by default), so proxied calls fail instead of being answered to simulate the server being unavailable. You can also pass a custom list of urls (which can contain globs, see win.webContents.session.webRequest.onBeforeRequest).
		 */
		blockNetwork: (page: Page, urls?: string[]) => Promise<void>
		/**
		 * Lets all the given window's requests through again, after blockNetwork.
		 */
		unblockNetwork: (page: Page) => Promise<void>
		/**
		 * Reads the cookies of the given window's session, all of them or the ones named.
		 *
		 * The window is matched by its position among the app's windows, which share creation order on both sides.
		 */
		getWindowCookies: (page: Page, name?: string) => Promise<Cookie[]>
	}>({
		browser: async ({ browser }, use) => {
			// every context a test creates carries __IS_TEST from the first load, app code reads it while booting
			const marked = browser as typeof browser & { isTestContextMarked?: boolean }
			if (!marked.isTestContextMarked) {
				marked.isTestContextMarked = true
				const newContext = browser.newContext.bind(browser)
				browser.newContext = async options => {
					const context = await newContext(options)
					await context.addInitScript(() => { (window as any).__IS_TEST = true })
					return context
				}
			}
			await use(browser)
		},
		// eslint-disable-next-line no-empty-pattern
		app: async ({}, use) => {
			const relative = path.relative(path.resolve(appDir), path.resolve(userDataDir))
			if (relative.startsWith("..") || path.isAbsolute(relative)) {
				throw new Error(`userDataDir must be inside appDir, got ${userDataDir}.`)
			}
			await rm(userDataDir, { recursive: true, force: true })

			const app = await electron.launch({
				// launched as an app directory so `app.getAppPath()` is the app root, which is where
				// @witchcraft/nuxt-logger resolves pino's workers from
				args: [".", "--no-sandbox", "--ignore-certificate-errors", `--user-data-dir=${userDataDir}`, ...extraArgs],
				cwd: appDir,
				env: {
					...process.env,
					...env,
					DISABLE_AUTO_UPDATES: "true",
					OVERRIDE_PUBLIC_SERVER_URL: serverUrl,
					...(useDevMode ? { VITE_DEV_SERVER_URL: serverUrl } : {})
				} as Record<string, string>
			})
			await use(app)
			await app.close()
		},
		page: async ({ waitForWindow }, use) => {
			await use(await waitForWindow())
		},

		waitForWindow: async ({ app }, use) => {
			const isAppWindow = (candidate: Page) => !candidate.url().startsWith("devtools://")
			await use(async (prefix = launchPrefix, timeout = windowTimeout): Promise<Page> => {
				const deadline = Date.now() + timeout
				const watched = new Map<Page, Promise<Page | undefined>>()
				let page: Page | undefined
				while (!page && Date.now() < deadline) {
					const next = await Promise.race([
						// watches windows already open until their url matches, the url is not set yet when a window appears
						...app.windows().filter(isAppWindow).map((candidate: Page): Promise<Page | undefined> => {
							let pending: Promise<Page | undefined> | undefined = watched.get(candidate)
							if (!pending) {
								pending = candidate.waitForURL(url => url.toString().startsWith(prefix), { timeout: Math.max(deadline - Date.now(), 1) }).then(() => candidate).catch(() => undefined)
								watched.set(candidate, pending)
							}
							return pending
						}),
						// notices each newly opening window, matched or not
						app.waitForEvent("window", { timeout: Math.max(deadline - Date.now(), 1) }).then(window => isAppWindow(window) ? window : undefined).catch(() => undefined)
					])
					// keeps only winners whose url matches
					if (next && next.url().startsWith(prefix)) page = next
				}
				if (!page) {
					const seen = app.windows().map(candidate => candidate.url())
					throw new Error(`No window with url starting with ${prefix}, saw: ${seen.join(", ") || "no windows"}.`)
				}
				return page
			})
		},

		getPageFromWindow: async ({ app }, use) => {
			const isAppWindow = (candidate: Page) => !candidate.url().startsWith("devtools://")
			// the first window is not a reopen, and its event has already fired by the time this runs
			const deadline = Date.now() + windowTimeout
			let first = app.windows().find(isAppWindow)
			while (!first && Date.now() < deadline) {
				const candidate = await app.waitForEvent("window", { timeout: Math.max(deadline - Date.now(), 1) }).catch(() => undefined)
				if (candidate && isAppWindow(candidate)) first = candidate
			}
			if (!first) throw new Error("getPageFromWindow: no app window opened.")
			const pending: Page[] = app.windows().filter(candidate => candidate !== first && isAppWindow(candidate))
			const waiting: (() => void)[] = []
			app.on("window", window => {
				if (window === first || !isAppWindow(window)) return
				pending.push(window)
				waiting.shift()?.()
			})
			await use(async () => {
				// the event can have fired before the caller asks, so the queue is the only source, never waitForEvent
				if (pending.length === 0) await new Promise<void>(resolve => waiting.push(resolve))
				const next = pending.shift()!
				await next.waitForLoadState("load", { timeout: windowTimeout })
				// the app closes the old window asynchronously, so it can still be listed while the new one loads
				await expect.poll(() => app.evaluate(electron => electron.BrowserWindow.getAllWindows().length), { timeout: windowTimeout }).toBe(1)
				return next
			})
		},
		blockNetwork: async ({ app }, use) => {
			await use(async (page: Page, urls: string[] = ["http://*/*", "https://*/*"]) => {
				const index = app.windows()
					.filter(candidate => {
						return !candidate.url().startsWith("devtools://")
					})
					.indexOf(page)

				if (index === -1) throw new Error("blockNetwork: the page does not belong to this app.")
				await app.evaluate((electron, { windowIndex, patterns }) => {
					const win = electron.BrowserWindow.getAllWindows()[windowIndex]
					if (!win) throw new Error("blockNetwork: no window at that index.")
					win.webContents.session.webRequest.onBeforeRequest(
						{ urls: patterns },
						(_details, callback) => callback({ cancel: true })
					)
				}, { windowIndex: index, patterns: urls })
			})
		},
		unblockNetwork: async ({ app }, use) => {
			await use(async (page: Page) => {
				const index = app.windows().filter(candidate => !candidate.url().startsWith("devtools://")).indexOf(page)
				if (index === -1) throw new Error("unblockNetwork: the page does not belong to this app.")
				await app.evaluate((electron, windowIndex) => {
					const win = electron.BrowserWindow.getAllWindows()[windowIndex]
					if (!win) throw new Error("unblockNetwork: no window at that index.")
					win.webContents.session.webRequest.onBeforeRequest(null)
				}, index)
			})
		},
		getWindowCookies: async ({ app }, use) => {
			await use(async (page: Page, name?: string) => {
				const index = app.windows().filter(candidate => !candidate.url().startsWith("devtools://")).indexOf(page)
				if (index === -1) throw new Error("getWindowCookies: the page does not belong to this app.")
				return app.evaluate((electron, { windowIndex, cookieName }) => {
					const win = electron.BrowserWindow.getAllWindows()[windowIndex]
					if (!win) throw new Error("getWindowCookies: no window at that index.")
					return win.webContents.session.cookies.get(cookieName ? { name: cookieName } : {})
				}, { windowIndex: index, cookieName: name })
			})
		}
	})
}
