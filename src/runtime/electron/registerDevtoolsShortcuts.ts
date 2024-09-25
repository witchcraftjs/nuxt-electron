/** Registers F12 and Ctrl+Shift+I as shortcuts to open the devtools. */
export function registerDevtoolsShortcuts(win: Electron.BrowserWindow): void {
	win.webContents.on("before-input-event", (event, input) => {
		if (input.type === "keyDown") {
			if ((input.shift && input.control && input.key.toLowerCase() === "i")
				|| (input.key === "F12")) {
				win.webContents.openDevTools()
				event.preventDefault()
			}
		}
	})
}
