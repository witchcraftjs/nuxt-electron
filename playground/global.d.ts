import type { ElectronIpcWindowApi } from "@witchcraft/nuxt-electron/electron"

declare global {
	interface Window {
		electron: {
			api: ElectronIpcWindowApi
		}
	}
}

export {}
