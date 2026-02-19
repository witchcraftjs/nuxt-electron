import { unreachable } from "@alanscodelog/utils/unreachable"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { STATIC } from "./static.js"

/**
 * Calculates the correct paths for the app to run in electron.
 *
 *
 * Paths are not overridable in production unless you pass the variables that can override them.
 *
 * ```ts
 * const paths = getPaths("app", {
 * 	windowUrl: process.env.OVERRIDE_WINDOW_URL,
 * 	publicServerUrl: process.env.OVERRIDE_PUBLIC_SERVER_URL
 * })
 * ```
 */
export function getPaths(
	protocolName: string = "app",
	overridingEnvs: Record<string, string | undefined> = {
		windowUrl: undefined,
		publicServerUrl: undefined
	}
): {
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
		publicServerUrl: (
			overridingEnvs.publicServerUrl
			?? process.env.PUBLIC_SERVER_URL
			?? process.env.VITE_DEV_SERVER_URL)!
	}
	if (!base.publicServerUrl) {
		throw new Error("publicServerUrl could not be determined.")
	}

	if (overridingEnvs.windowUrl) {
		return {
			...base,
			windowUrl: `${overridingEnvs.windowUrl}${STATIC.ELECTRON_ROUTE}`
		}
	}

	if (process.env.NODE_ENV === "production" && process.env.VITE_DEV_SERVER_URL) {
		return {
			...base,
			windowUrl: `${process.env.VITE_DEV_SERVER_URL}${STATIC.ELECTRON_ROUTE}`
		}
		// this will always be defined in production since they are defined by vite
	} else if (STATIC.ELECTRON_PROD_URL !== undefined && STATIC.ELECTRON_BUILD_DIR !== undefined) {
		return {
			...base,
			// careful, do not use path.join, it will remove extra slashes
			windowUrl: `${protocolName}://bundle/${STATIC.ELECTRON_PROD_URL}`
		}
	}
	unreachable()
}
