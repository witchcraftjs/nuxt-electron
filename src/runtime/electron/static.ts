import { type PublicRuntimeConfig } from "nuxt/schema"


// Note that we must write them out like this (with the full path to the env variable) for vite to find them.
/**
 * Group of the module's vite's injected variables.
 */
export const STATIC = {
	ELECTRON_ROUTE: process.env.ELECTRON_ROUTE!,
	ELECTRON_PROD_URL: process.env.ELECTRON_PROD_URL!,
	ELECTRON_NUXT_DIR: process.env.ELECTRON_NUXT_DIR!,
	ELECTRON_NUXT_PUBLIC_DIR: process.env.ELECTRON_NUXT_PUBLIC_DIR!,
	ELECTRON_BUILD_DIR: process.env.ELECTRON_BUILD_DIR!,
	ELECTRON_RUNTIME_CONFIG: (process.env.ELECTRON_RUNTIME_CONFIG ? JSON.parse(process.env.ELECTRON_RUNTIME_CONFIG) : undefined) as PublicRuntimeConfig,
}

