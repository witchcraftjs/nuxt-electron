import type { Page } from "@playwright/test"

/**
 * Waits until the page is on the route path, whatever the scheme and host are. The same route is app://bundle/authed in the bundle and http://localhost/authed in dev, so matching the pathname is what keeps one assertion working in both.
 */
export async function waitUntilAtPath(page: Page, routePath: string, timeout?: number): Promise<void> {
	await page.waitForURL(url => {
		try {
			return new URL(url).pathname === routePath
		} catch {
			return false
		}
	}, { timeout })
}
