import { set } from "@alanscodelog/utils/set"
import { ipcRenderer } from "electron"

import type { ElectronIpcMessages } from "./types.js"

/**
 * Type safe wrapper around ipcRenderer.invoke which also creates the api function at the proper path.
 *
 * This makes every single part of the api type safe while avoiding repetition.
 *
 * ```ts [preload.ts]
 * import { mergeApi, createApi } from "@witchcraft/nuxt-electron/electron"
 *
 * declare module "@witchcraft/nuxt-electron" {
 * 	interface Register {
 * 		ElectronIpcTestMethod: {
 * 			path: "my.test.method"
 * 			func: (arg1: string, arg2: number) => Promise<void>
 * 			prefix: "avoidConflict" // optional (and yes you can do avoid.conflict and have it nested further)
 * 		}
 * 	}
 * }
 *
 * contextBridge.exposeInMainWorld("electron", {
 * 	api: mergeApi(
 * 		createApi("my.test.method"), // returns { "my.test.method": (...args: any[]) => Promise<void> }
 * 		createApi("avoidConflict.my.test.method") // returns { "avoidConflict.my.test.method": (...args: any[]) => Promise<void> }
 * 	),
 * 	// mergeApi creates a structure like:
 * 	// {
 * 	// 	my: {
 * 	// 		test: {
 * 	// 			method: (arg1: string, arg2: number) => Promise<void>
 * 	// 		}
 * 	// 	},
 * 	// 	avoidConflict: {
 * 	// 		my: {
 * 	// 			test: {
 * 	// 				method: (arg1: string, arg2: number) => Promise<void>
 * 	// 			}
 * 	// 		}
 * 	// 	}
 * 	// }
 * })
 * ```
 *
 * ```ts [main.ts]
 * import { createApi } from "@witchcraft/nuxt-electron/electron"
 * ipcHandle("my.test.method", (event, arg1, arg2) => { ... })
 * ipcHandle("avoidConflict.my.test.method", (event, arg1, arg2) => { ... })
 * ```
 *
 * Add the window types:
 * ```ts [global.d.ts]
 * import type { ElectronIpcWindowApi } from "@witchcraft/nuxt-electron/electron"
 *
 * declare global {
 * 	interface Window {
 * 		electron: {
 * 			api: ElectronIpcWindowApi
 * 		}
 * 	}
 * }
 *
 * export {}
 * ```
 *
 * Use from the renderer:
 * ```ts [renderer.ts]
 * const res = await window.electron.api.my.test.method("hello", 123)
 * const res2 = await window.electron.avoidConflict.api.my.test.method("hello", 123)
 * ```
 */
export function createApi<
	TKey extends keyof ElectronIpcMessages,
	TEntry extends ElectronIpcMessages[TKey] = ElectronIpcMessages[TKey],
	// Extract prefix if it exists, otherwise default to empty string
	TPrefix extends string = TEntry extends { prefix: infer P extends string } ? P : "",
	TPath extends string = TEntry["path"],
	TFunction extends TEntry["func"] = TEntry["func"]
>(
	path: TPath,
	prefix: TPrefix = "" as any
): { [K in `${TPrefix}${TPath}`]: TFunction } {
	const res: any = {}
	const fullPath = prefix !== "" ? `${prefix}.${path}` : path
	set(res, fullPath.split("."), (...args: Parameters<TFunction>) => ipcRenderer.invoke(fullPath, ...args))
	return res
}
