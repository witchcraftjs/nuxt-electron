import type { PublicRuntimeConfig } from "nuxt/schema"

import { STATIC } from "./static.js"

export function useNuxtRuntimeConfig(): PublicRuntimeConfig {
	return STATIC.ELECTRON_RUNTIME_CONFIG
}
