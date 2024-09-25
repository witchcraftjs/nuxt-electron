import {
	createNuxtFileProtocolHandler,
	getPaths,
	registerDevtoolsShortcuts,
	STATIC,
	useDevDataDir,
} from "@witchcraft/nuxt-electron/electron"
import { app, BrowserWindow, Menu } from "electron"


const isDev = process.env.NODE_ENV === "development"


app.enableSandbox()

const paths = getPaths()

const windows: BrowserWindow[] = []

if (!isDev) {
	// allow top menu to allow Ctrl+R reloading
	Menu.setApplicationMenu(null)
}

/** Optional @witchcraft/nuxt-logger usage */
import { useLoggerElectron } from "@witchcraft/nuxt-logger/electron"
import path from "path"


const userDataDir = useDevDataDir() ?? app.getPath("userData")

const logger = useLoggerElectron(
	{
		...STATIC.ELECTRON_RUNTIME_CONFIG.logger,
		logPath: path.join(userDataDir, "log.txt"),
	},
	() => windows
)

logger.info({ ns: "main:start", message: "Hello from electron main." })

/** End @witchcraft/nuxt-logger usage */
if (!process.env.VITE_DEV_URL && !process.env.PUBLIC_SERVER_API_URL) {
	logger.warn({ ns: "main:no-server-proxies", message: "No VITE_DEV_URL or PUBLIC_SERVER_API_URL set. This is required for the /api routes to work in production." })
}

const serverUrl = process.env.PUBLIC_SERVER_API_URL ?? (
		process.env.VITE_DEV_URL
		? `${process.env.VITE_DEV_URL}:3000`
	: "")
const proxies = {
	"/api": serverUrl,
}
logger.debug({ ns: "main:proxies", message: proxies })

const defaultWebPreferences: Electron.WebPreferences = {
	contextIsolation: true,
	nodeIntegration: false,
	preload: paths.preloadPath,
}

void app.whenReady().then(async () => {
	const win = new BrowserWindow({
		title: app.getName(),
		webPreferences: defaultWebPreferences,
	})

	windows.push(win)
	// for every window
	createNuxtFileProtocolHandler(win, paths.nuxtPublicDir, proxies)
	registerDevtoolsShortcuts(win)

	if (isDev) {
		win.webContents.openDevTools()
	}
	win.webContents.on("did-finish-load", () => {
		setTimeout(() => {
			logger.info({ ns: "main:didfinishload", message: "Hello to window." })
		}, 1000) // not sure why this is needed, but it is
	})
	win.on("closed", () => windows.splice(windows.indexOf(win), 1))

	await win.loadURL(paths.windowUrl)
})
