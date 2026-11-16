/**
 * The url the local dev server is reached on. https is used if  LOCALHOST_KEY_PEM and LOCALHOST_PEM are set.
 *
 * Defaults to `http://localhost:${NUXT_POST ?? 3000}`
 *
 */
export function localhostUrl(port: string | number = process.env.NUXT_PORT ?? "3000"): string {
	const certs = process.env.LOCALHOST_KEY_PEM && process.env.LOCALHOST_PEM
	return `${certs ? "https" : "http"}://localhost:${port}`
}
