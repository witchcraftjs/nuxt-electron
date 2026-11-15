import { expect, test } from "@playwright/test"

import { launchApp } from "./utils.js"

test("boots, loads the built app and reaches the server", async () => {
	const { app, page, close } = await launchApp()

	const url = page.url()
	const name = await app.evaluate(async ({ app }) => app.getName())
	const apiResponse = await page.evaluate(() => fetch("/api/test").then(async response => response.text()).catch(() => null))
	await close()

	expect(url.startsWith("app://bundle")).toBe(true)
	expect(name).toBeTruthy()
	expect(apiResponse).toBe("Hello Electron!")
})
