import type { BrowserWindow } from "electron"

import { windowControlsMessageKey } from "./createWindowControlsApi.js"
import { promisifyReply } from "./promisifyReply.js"
import type { WindowControlsApi } from "./types.js"

export function createWindowControlsApiHandler(
	/** Mostly for logging. Does not replace the action. */
	cb?: (win: BrowserWindow | undefined, action: "close" | "minimize" | "toggleMaximize" | "togglePin")	=> void
) {
	promisifyReply<
		WindowControlsApi
	>(windowControlsMessageKey, async (win, action) => {
		switch (action) {
			case "close":
				win?.close()
				break
			case "minimize":
				win?.minimize()
				break
			case "toggleMaximize":
				// eslint-disable-next-line no-console
				console.log(win?.isMaximized())
				win?.isMaximized() ? win?.unmaximize() : win?.maximize()
				break
			case "togglePin":
				win?.setAlwaysOnTop(!win?.isAlwaysOnTop())
				break
			default:
				throw new Error(`Invalid action: ${action}`)
		}
		cb?.(win, action)
	})
}
