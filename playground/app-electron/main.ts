import {
	createPrivilegedProtocolScheme,
	createProxiedProtocolHandler,
	getPaths,
	registerDevtoolsShortcuts,
	STATIC,
	useDevDataDir
} from "@witchcraft/nuxt-electron/electron"
import {
	app,
	BrowserWindow,
	ipcMain,
	Menu,
	protocol,
	session
} from "electron"

app.enableSandbox()

const protocolName = "app"
const paths = getPaths(protocolName, {
	// these allow the user to override the paths in production
	// remove them if you don't want to allow it
	windowUrl: process.env.OVERRIDE_WINDOW_URL,
	publicServerUrl: process.env.OVERRIDE_PUBLIC_SERVER_URL
})

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
		...STATIC.ELECTRON_RUNTIME_CONFIG.logger as any,
		logPath: path.join(userDataDir, "log.txt")
	},
	() => windows
)

logger.info({
	ns: "main:start",
	paths,
	userDataDir
})

/** End @witchcraft/nuxt-logger usage */

protocol.registerSchemesAsPrivileged([
	createPrivilegedProtocolScheme("app")
])

const proxies = {
	"/api": paths.publicServerUrl
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
	const partition = "persist:example"

	const ses = session.fromPartition(partition)

	// if you aren't using partitions, you can just pass `protocol` from electron
	createProxiedProtocolHandler(
		ses.protocol,
		protocolName,
		paths.nuxtPublicDir,
		proxies,
		{ logger }
	)

	const win = new BrowserWindow({
		title: app.getName(),
		webPreferences: {
			...defaultWebPreferences,
			partition
		}
	})

	windows.push(win)

	registerDevtoolsShortcuts(win)

	if (import.meta.dev) {
		win.webContents.openDevTools()
	}
	win.webContents.on("did-finish-load", () => {
		setTimeout(() => {
			logger.info({ ns: "main:did-finish-load", msg: "Hello to window." })
		}, 1000) // not sure why this is needed, but it is
	})
	win.on("closed", () => windows.splice(windows.indexOf(win), 1))

	await win.loadURL(paths.windowUrl)
})
