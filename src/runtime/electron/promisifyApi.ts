import type { IpcRenderer } from "electron"

const promiseResolveMap = new Map<string, {
	resolve: (value: any) => void
	reject: (reason?: any) => void
}>()

/**
 * Promisify an electron api and make it type safe so it can be awaited client side. Note that promisifyReply will throw if it can't find a window.
 *
 * ```ts[type.st]
 * export type ElectronApi = {
 * 	api: {
 * 		someApi: (apiParam: string, apiParam2: number) => Promise<void>
 * 	}
 * }
 * ```
 * ```ts [preload.ts]
 * contextBridge.exposeInMainWorld("electron", {
 * 	api: {
 * 		...promisifyApi<"someApi", ElectronApi["api"]["someApi"]>(ipcRenderer, "someApi", MESSAGE.UNIQUE_KEY),
 * 	},
 * })
 * ```
 *
 * ```ts [main.ts]
 * import { promisifyReply } from "@witchcraft/nuxt-electron/runtime/electron"
 * promisifyReply<
 * 	ElectronApi["api"]["someApi"]
 * >(ipcRenderer, MESSAGE.UNIQUE_KEY, (win, apiParam, apiParam2) => {
 * 	// this doesn't have to be async, though on the client side,
 * 	// it will always be async
 * 	return electronSideOfApi(apiParam, apiParam2)
 * })
 * ```
 *
 * ```ts [renderer.ts]
 * const result = await electron.api.someApi(apiParam, apiParam2)
 * ```
 *
 * By default, calls will timeout and reject after 10 seconds. This can be changed by changing the timeout option.
 */
export function promisifyApi<
	TKey extends string,
	TFunction extends (...args: any) => Promise<any>,
	TArgs extends Parameters<TFunction> = Parameters<TFunction>
>(
	ipcRenderer: IpcRenderer,
	key: TKey,
	messageKey: string,
	modifyArgs?: (args: TArgs) => any,
	{ debug, timeout }: { debug?: boolean, timeout?: number } = { debug: true, timeout: 10000 }
): Record<TKey, TFunction> {
	return {
		[key]: async (...args: TArgs) => new Promise((resolve, reject) => {
			// preload script should have access to crypto
			// can't seem to get node crypto to import even renamed
			const promiseId = crypto.randomUUID()
			promiseResolveMap.set(promiseId, { resolve, reject })
			if (modifyArgs) {
				args = modifyArgs(args)
			}
			if (debug) {
				// eslint-disable-next-line no-console
				console.log("promisifyApi:sent", messageKey, promiseId, args)
			}

			const timer: number | NodeJS.Timeout = setTimeout(() => {
				const resolver = promiseResolveMap.get(promiseId)
				if (resolver) {
					promiseResolveMap.delete(promiseId)
					ipcRenderer.off(messageKey, listener)
					resolver.reject(new Error(`promisifyApi: Timeout for ${messageKey}`))
				}
			}, timeout)
			function listener(
				_event: Electron.IpcRendererEvent,
				resPromiseId: string,
				res: any,
				info?: { isError?: boolean }
			): void {
				if (debug) {
					// eslint-disable-next-line no-console
					console.log("promiseApi:received", resPromiseId, res)
				}
				const resolver = promiseResolveMap.get(resPromiseId)
				if (resolver) {
					clearTimeout(timer)
					promiseResolveMap.delete(resPromiseId)
					ipcRenderer.off(messageKey, listener)
					if (info?.isError) {
						resolver.reject(res)
					} else {
						resolver.resolve(res)
					}
				}
			}
			ipcRenderer.on(messageKey, listener)
			ipcRenderer.send(messageKey, promiseId, ...args)
		})
	} as any
}
