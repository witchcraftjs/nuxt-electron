import type { Page } from "@playwright/test"

/**
 * The url the local dev server is reached on. https needs both LOCALHOST_KEY_PEM and LOCALHOST_PEM set, otherwise http.
 *
 * Uses NUXT_PORT by default, override with an port from an env or a number. If the port is undefined, it will throw.
 */
export function localhostUrl(port?: string | number): string {
	const resolved = port ?? process.env.NUXT_PORT
	if (resolved === undefined) throw new Error("localhostUrl: pass a port or set NUXT_PORT.")
	const certs = process.env.LOCALHOST_KEY_PEM && process.env.LOCALHOST_PEM
	return `${certs ? "https" : "http"}://localhost:${resolved}`
}
