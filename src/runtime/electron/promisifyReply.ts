import { type BrowserWindow, ipcMain } from "electron"

import { getEventWindow } from "./getEventWindow.js"

/** See {@link promisifyApi} for more info. */
export function promisifyReply<
	TFunction extends ((...args: any[]) => any),
	TKey extends string = string,
	TArgs extends Parameters<TFunction> = Parameters<TFunction>,
	TReturn extends ReturnType<TFunction> = ReturnType<TFunction>
>(
	key: TKey,
	cb: (win?: BrowserWindow, ...args: TArgs) => Promise<TReturn> | TReturn,
	/** See {@link getEventWindow}. */
	{
		defaultToFocused = true,
		debug = false
	}: {
		defaultToFocused?: boolean
		debug?: boolean
	} = {}
): void {
	ipcMain.on(key, (
		e,
		promiseId: string,
		...args: any[]
	) => {
		const win = getEventWindow(e, { defaultToFocused })
		if (!win) {
			const err = new Error("No window to send reply to.")
			// eslint-disable-next-line no-console
			console.error(err, { key, promiseId, args })
			throw err
		}
		if (debug) {
			// eslint-disable-next-line no-console
			console.log({ key, promiseId, args })
		}
		const res = cb(win, ...args as TArgs)
		if (res instanceof Promise) {
			res.then((innerRes: any) => {
				win.webContents.send(key, promiseId, innerRes)
			}).catch(err => {
				// eslint-disable-next-line no-console
				console.error(err, { key, promiseId, args })
				win.webContents.send(key, promiseId, err, { isError: true })
			})
		} else {
			win.webContents.send(key, promiseId, res)
		}
	})
}
