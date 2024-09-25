/** Optional @witchcraft/nuxt-logger usage */

import { createElectronLoggerApi } from "@witchcraft/nuxt-logger/electron"
import { contextBridge, ipcRenderer } from "electron"
// eslint-disable-next-line no-console
console.log("---preload---")
contextBridge.exposeInMainWorld("electron", {
	test: () => ipcRenderer.send("test"),
	api: {
		...createElectronLoggerApi(ipcRenderer)
	},
})
