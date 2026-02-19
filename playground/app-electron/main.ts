import {
	createNuxtFileProtocolHandler,
	getPaths,
	registerDevtoolsShortcuts,
	STATIC,
	useDevDataDir
} from "@witchcraft/nuxt-electron/electron"
import { app, BrowserWindow, ipcMain, Menu } from "electron"

app.enableSandbox()

const paths = getPaths()

const windows: BrowserWindow[] = []

if (!import.meta.dev) {
	// allow top menu to allow Ctrl+R reloading
	Menu.setApplicationMenu(null)
}

/** Optional @witchcraft/nuxt-logger usage */
import { useElectronLogger } from "@witchcraft/nuxt-logger/electron"
import path from "node:path"


const userDataDir = useDevDataDir() ?? app.getPath("userData")

const logger = useElectronLogger(
	{
		...STATIC.ELECTRON_RUNTIME_CONFIG.logger,
		logPath: path.join(userDataDir, "log.txt")
	},
	() => windows
)

logger.info({ ns: "main:start", msg: "Hello from electron main." })

/** End @witchcraft/nuxt-logger usage */
if (!process.env.PUBLIC_SERVER_URL && !process.env.VITE_DEV_URL && !process.env.PUBLIC_SERVER_URL) {
	logger.warn({ ns: "main:no-server-proxies", msg: "No VITE_DEV_URL or PUBLIC_SERVER_URL set. This is required for the /api routes to work in production." })
}

logger.warn({ ns: "main:serverUrl", msg: paths.publicServerUrl })
const proxies = {
	"/api": paths.publicServerUrl,
}
logger.debug({ ns: "main:proxies", msg: proxies })

const defaultWebPreferences: Electron.WebPreferences = {
	contextIsolation: true,
	nodeIntegration: false,
	preload: paths.preloadPath
}
ipcMain.on("test", () => {
	logger.info({ ns: "main:test", msg: "Hello from main." })
})
void app.whenReady().then(async () => {
	const win = new BrowserWindow({
		title: app.getName(),
		webPreferences: defaultWebPreferences
	})

	windows.push(win)
	// for every window
	createNuxtFileProtocolHandler(win.webContents.session, paths.nuxtPublicDir, proxies)
	registerDevtoolsShortcuts(win)

	if (import.meta.dev) {
		win.webContents.openDevTools()
	}
	win.webContents.on("did-finish-load", () => {
		setTimeout(() => {
			logger.info({ ns: "main:didfinishload", msg: "Hello to window." })
		}, 1000) // not sure why this is needed, but it is
	})
	win.on("closed", () => windows.splice(windows.indexOf(win), 1))

	await win.loadURL(paths.windowUrl)
})
