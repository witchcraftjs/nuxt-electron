import type { BrowserWindow } from "electron"

export function createBroadcaster<
	TEvents extends Record<string, (...args: any) => any>
>(key: string, getWindows: () => BrowserWindow[]) {
	return function broadcast<T extends keyof TEvents>(event: T, ...args: Parameters<TEvents[T]>) {
		for (const win of getWindows()) {
			win.webContents.send(key, event, ...args)
		}
	}
}
