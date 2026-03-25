import { ipcMain } from "electron"

import type { ElectronIpcMessages } from "./types.js"

/**
 * Type safe wrapper around ipcMain.handle. See {@link createApi} for more info.
 */
export function handleApi<
	TFullPath extends keyof ElectronIpcMessages,
	TFunction extends ElectronIpcMessages[TFullPath]["func"]
>(
	path: TFullPath,
	// it can return a plain value or a promise that will resolve to that value
	// since it's promisified anyways
	cb: (event: Electron.IpcMainInvokeEvent, ...args: Parameters<TFunction>) => ReturnType<TFunction> | Awaited<ReturnType<TFunction>>
): void {
	ipcMain.handle(path, cb)
}

