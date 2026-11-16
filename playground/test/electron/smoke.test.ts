import { expect } from "@playwright/test"

import { launchElectron } from "@witchcraft/nuxt-electron/electron/test"

import { assertBuilt, playgroundDir, profileDir, serverUrl } from "./paths.js"

assertBuilt()

const test = launchElectron({
	appDir: playgroundDir,
	userDataDir: profileDir(".user-data-dir-test"),
	serverUrl,
	bundlePrefix: "app://bundle"
})

test("launchElectron: window (bundled) boots, server api works", async ({ app, page }) => {
	const url = page.url()
	const name = await app.evaluate(async ({ app }) => app.getName())
	const apiResponse = await page.evaluate(() => fetch("/api/test").then(async response => response.text()).catch(() => null))

	expect(url.startsWith("app://bundle")).toBe(true)
	expect(name).toBeTruthy()
	expect(apiResponse).toBe("Hello Electron!")
})
