import { createApi, mergeApi } from "@witchcraft/nuxt-electron/electron"
import { createElectronLoggerApi } from "@witchcraft/nuxt-logger/electron"
// eslint-disable-next-line import/no-extraneous-dependencies
import { contextBridge, ipcRenderer } from "electron"

declare module "@witchcraft/nuxt-electron/electron" {
	export interface Register {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		ElectronIpcPing: {
			func: (message: string) => Promise<string>
			path: "ping"
		}
		// eslint-disable-next-line @typescript-eslint/naming-convention
		ElectronIpcPingPrefixed: {
			func: (message: string) => Promise<string>
			path: "ping"
			prefix: "prefixed"
		}
	}
}

// eslint-disable-next-line no-console
console.log("---preload---")
contextBridge.exposeInMainWorld("electron", {
	test: () => ipcRenderer.send("test"),
	api: mergeApi(
		/** Optional @witchcraft/nuxt-logger usage */
		createElectronLoggerApi(ipcRenderer),
		createApi("ping"),
		createApi("ping", "prefixed")
	)
})
