import { BrowserWindow } from "electron"

/**
 * Gets the window that sent the event if it exists, otherwise tries to use the focused window.
 *
 * Set `defaultToFocused` to false to only use the sender window.
 *
 * Returns undefined if no window is found.
 */
export function getEventWindow(
	e: Electron.IpcMainEvent,
	{ defaultToFocused = true } = {}
): BrowserWindow | undefined {
	const senderWindow = BrowserWindow.fromId(e.sender.id)
	if (defaultToFocused) {
		return senderWindow ?? BrowserWindow.getFocusedWindow() ?? undefined
	}
	return senderWindow ?? undefined
}
