import { expect } from "@playwright/test"
import { launchElectron, waitUntilAtPath } from "@witchcraft/nuxt-electron/electron/test"

import { playgroundDir, profileDir, serverUrl } from "./paths.js"

const test = launchElectron({
	appDir: playgroundDir,
	userDataDir: profileDir(".user-data-dir-test"),
	serverUrl,
	bundlePrefix: "app://bundle"
})

const devTest = launchElectron({
	appDir: playgroundDir,
	userDataDir: profileDir(".user-data-dir-test"),
	serverUrl,
	useDevMode: true
})

test.describe("bundled mode", () => {
	test("waitForWindow", async ({ page, waitForWindow }) => {
		expect((await waitForWindow()).url()).toBe(page.url())
		expect((await waitForWindow("app://bundle")).url()).toBe(page.url())

		await expect(waitForWindow("http://nothing-matches-this", 1000)).rejects.toThrow("No window with url starting with http://nothing-matches-this")
	})

	test("waitUntilAtPath", async ({ page }) => {
	// the playground redirects / to /app in electron
		await waitUntilAtPath(page, "/app")

		await page.getByRole("link", { name: "Go to /app/other-app-page (should work)" }).click()
		await waitUntilAtPath(page, "/app/other-app-page")

		await expect(page.getByText("Other App Page")).toBeVisible()
	})

	test("blockNetwork => silent, unblockNetwork => answers", async ({ page, blockNetwork, unblockNetwork }) => {
		const readApi = () => page.evaluate(() => fetch("/api/test").then(async response => response.text()).catch(() => null))
		expect(await readApi()).toBe("Hello Electron!")

		await blockNetwork(page)
		expect(await readApi()).toBeNull()

		await unblockNetwork(page)
		expect(await readApi()).toBe("Hello Electron!")
	})

	test("blockNetwork with patterns only blocks those", async ({ page, blockNetwork, unblockNetwork }) => {
		const readApi = () => page.evaluate(() => fetch("/api/test").then(async response => response.text()).catch(() => null))
		await blockNetwork(page, ["https://example.com/*"])
		expect(await readApi()).toBe("Hello Electron!")
		await unblockNetwork(page)
		expect(await readApi()).toBe("Hello Electron!")
	})

	test("getWindowCookies", async ({ app, page, getWindowCookies }) => {
		await app.evaluate(async (electron, url) => {
			await electron.session.fromPartition("persist:example").cookies.set({ url, name: "probe", value: "abc" })
		}, serverUrl)

		expect((await getWindowCookies(page)).map(cookie => cookie.name)).toContain("probe")
		expect((await getWindowCookies(page, "probe")).map(cookie => cookie.value)).toEqual(["abc"])
		expect(await getWindowCookies(page, "missing")).toEqual([])
	})

	test("getPageFromWindow", async ({ app, page, getPageFromWindow }) => {
		await app.evaluate(async electron => {
			const win = new electron.BrowserWindow({ show: false, webPreferences: { session: electron.session.fromPartition("persist:example") } })
			await win.loadURL("app://bundle/app/other-app-page")
		})

		// closing the window destroys its own context, so the reply may never arrive
		await page.evaluate(() => window.close()).catch(() => {})
		const next = await getPageFromWindow()

		expect(next.url()).toBe("app://bundle/app/other-app-page")
	})
})

devTest.describe("dev mode", () => {
	devTest("window boots from the server", async ({ page }) => {
		expect(page.url().startsWith(serverUrl)).toBe(true)
		await expect(page.getByText("Electron Only")).toBeVisible()
	})
})
