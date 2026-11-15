import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test"
import { existsSync } from "node:fs"
import { rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const playgroundDir = fileURLToPath(new URL("../..", import.meta.url))
/** Fresh profile per launch, in the playground (gitignored) so it can be inspected. */
const userDataDir = fileURLToPath(new URL("../../.user-data-dir-test", import.meta.url))
/** The production build of the playground app, made with `pnpm build:electron:no-pack`. */
const mainEntry = fileURLToPath(new URL("../../.dist/electron/build/main.mjs", import.meta.url))

/**
 * Launches the built playground app and waits for its window.
 *
 * Every launch shares `.user-data-dir-test`, which is wiped first so a session stored by an
 * earlier test never leaks into this one.
 */
export async function launchApp(): Promise<{ app: ElectronApplication, page: Page, close: () => Promise<void> }> {
	if (!existsSync(mainEntry)) {
		throw new Error(`Missing ${mainEntry}, run \`pnpm build:electron:no-pack\` in playground first.`)
	}
	if (!process.env.NUXT_PORT) {
		throw new Error("NUXT_PORT is not set, the test server port must be known to point the app at it.")
	}
	const serverUrl = `http://localhost:${process.env.NUXT_PORT}`
	await rm(userDataDir, { recursive: true, force: true })
	// no SUID sandbox helper on nix
	const app = await electron.launch({
		args: [".", "--no-sandbox", "--ignore-certificate-errors", `--user-data-dir=${userDataDir}`],
		cwd: playgroundDir,
		env: {
			...process.env,
			DISABLE_AUTO_UPDATES: "true",
			OVERRIDE_PUBLIC_SERVER_URL: serverUrl,
			...(process.env.TEST_ELECTRON_DEV === "1"
				? {
						// we point the app at the dev server (note this would not work with BAKED_IS_PRODUCTION being true)
						VITE_DEV_SERVER_URL: serverUrl
					}
				: {})
		} as Record<string, string>
	})
	const first = await app.firstWindow()
	// the playground opens devtools in its own window, so take the first window that is not devtools
	const page = first.url().startsWith("devtools://")
		? (app.windows().find(candidate => !candidate.url().startsWith("devtools://")) ?? await app.waitForEvent("window"))
		: first
	await page.waitForLoadState()
	const close = async () => {
		await app.close()
	}
	return { app, page, close }
}
