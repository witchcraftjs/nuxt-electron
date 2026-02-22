import { unreachable } from "@alanscodelog/utils/unreachable"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { STATIC } from "./static.js"

/**
 * Calculates the correct paths for the app to run in electron.
 *
 * Note: For serverUrl to not be overridable in production, you should set `electron.additionalElectronVariables.publicServerUrl` to a quoted string.
 *
 * ```ts[nuxt.config.ts]
 * export default defineNuxtConfig({
 * 	modules: [
 * 		"@witchcraft/nuxt-electron",
 * 	],
 * 	electron: {
 * 		additionalElectronVariables: {
 * 			publicServerUrl: process.env.NODE_ENV === "production"
 * 			? `"mysite.com"`
 * 			: `undefined`
 * 		}
 * 	}
 * })
 * ```
 */
export function getPaths(): {
	windowUrl: string
	publicServerUrl: string
	nuxtPublicDir: string
	preloadPath: string
} {
	// this will be the same in dev and prod and makes things simpler
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const __dirname = path.dirname(fileURLToPath(import.meta.url))

	const nuxtPublicDir = path.join(__dirname, STATIC.ELECTRON_NUXT_PUBLIC_DIR!)

	const preloadPath = path.join(__dirname, STATIC.ELECTRON_BUILD_DIR!, "./preload.cjs")

	const base = {
		nuxtPublicDir,
		preloadPath,
		publicServerUrl: (process.env.PUBLIC_SERVER_URL
			// allows us to override it when previewing (VITE_DEV_URL is not available then)
			?? process.env.PUBLIC_SERVER_URL
			?? process.env.VITE_DEV_SERVER_URL)!
	}
	if (!base.publicServerUrl) {
		throw new Error("publicServerUrl could not be determined.")
	}

	if (process.env.VITE_DEV_SERVER_URL) {
		return {
			...base,
			windowUrl: `${process.env.VITE_DEV_SERVER_URL}${STATIC.ELECTRON_ROUTE}`
		}
		// this will always be defined in production since they are defined by vite
	} else if (STATIC.ELECTRON_PROD_URL !== undefined && STATIC.ELECTRON_BUILD_DIR !== undefined) {
		return {
			...base,
			// careful, do not use path.join, it will remove extra slashes
			windowUrl: `file://${STATIC.ELECTRON_PROD_URL}`
		}
	}
	unreachable()
}
