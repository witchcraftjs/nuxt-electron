import { unreachable } from "@alanscodelog/utils/unreachable.js"
import { app } from "electron"
import path from "path"

import { STATIC } from "./static.js"

export function forceRelativePath(filepath: string): string {
	return path.join(`.${path.sep}`, filepath)
}

export function getPaths(): {
	windowUrl: string
	nuxtPublicDir: string
	preloadPath: string
} {
	const rootDir = app.getAppPath()
	const nuxtPublicDir = path.resolve(rootDir, forceRelativePath(STATIC.ELECTRON_NUXT_PUBLIC_DIR!))

	const preloadPath = path.resolve(rootDir, forceRelativePath(STATIC.ELECTRON_BUILD_DIR!), "./preload.cjs")

	const base = { nuxtPublicDir, preloadPath }

	if (process.env.VITE_DEV_SERVER_URL) {
		return {
			...base,
			windowUrl: `${process.env.VITE_DEV_SERVER_URL}${STATIC.ELECTRON_ROUTE}`,
		}
		// this will always be defined in production since they are defined by vite
	} else if (STATIC.ELECTRON_PROD_URL && STATIC.ELECTRON_BUILD_DIR) {
		return {
			...base,
			// careful, do not use path.join, it will remove extra slashes
			windowUrl: `file://${STATIC.ELECTRON_PROD_URL}`,
		}
	}
	unreachable()
}
