import { NUXT_ELECTRON_ERROR } from "../types.js"

/**
 * Throws an error named {@link NUXT_ELECTRON_ERROR.INSECURE_CONTEXT} when the window is not a secure context.
 *
 * ````ts [preload.ts]
 * import { assertSecureContext } from "@witchcraft/nuxt-electron/electron/preload"
 *
 * assertSecureContext()
 * ```
 *
 * A throw in the preload is silent, so main reports it through `preload-error`:
 *
 * ````ts [main.ts]
 * win.webContents.on("preload-error", (_event, path, error) => {
 * 	logger.error({ ns: "electron:preload", path, error: error.message })
 * 	if (error.name === NUXT_ELECTRON_ERROR.INSECURE_CONTEXT) app.exit(1)
 * })
 * ```
 */
export function assertSecureContext(): void {
	if (globalThis.isSecureContext) return

	const scheme = globalThis.location.protocol.replace(/:$/, "")
	const error = new Error([
		`[nuxt-electron] the window is not a secure context: the "${scheme}" scheme has no privileges.`,
		"Check, in main that:",
		`1. protocol.registerSchemesAsPrivileged registers "${scheme}" with { standard: true, secure: true, supportFetchAPI: true }.`,
		"2. it is called before app.whenReady().",
		"3. it is called once, a second call replaces the first (check other functions/dependencies aren't calling it after you if you only call once)."
	].join("\n"))
	error.name = NUXT_ELECTRON_ERROR.INSECURE_CONTEXT
	throw error
}
