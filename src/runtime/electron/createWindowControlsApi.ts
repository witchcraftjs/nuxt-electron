import type { IpcRenderer } from "electron"

import { promisifyApi } from "./promisifyApi.js"
import type { WindowControlsApi } from "./types.js"

const key = "window-control-action"
/**
 * Creates the apis to control the window from the preload script / client.
 *
 * ```ts
 * // the default handler expects it to exist under `electron.api.ui.windowAction`
 * // but you can configure it to use a different path
 * constextBridge.exposeInMainWorld("electron", {
 *		api: {
 * 		ui: {
 *				...createWindowControlsApi("windowAction")
 * 		}
 *		}
 * })
 * ```
 */
export function createWindowControlsApi(ipcRenderer: IpcRenderer, name: string): Record<string, WindowControlsApi> {
	return promisifyApi<typeof name,
		WindowControlsApi
	>(ipcRenderer, name, key)
}
export const windowControlsMessageKey = key
