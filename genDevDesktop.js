import { crop } from "@alanscodelog/utils/crop"
import { run } from "@alanscodelog/utils/run"
import JSON5 from "json5"
import fsSync from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"

if (process.env.CI) {
	// eslint-disable-next-line no-console
	console.log("Skipping desktop file generation in CI.")
	process.exit(0)
}

if (["darwin", "linux"].includes(process.platform)) {
	// eslint-disable-next-line no-console
	console.log("Generating dev desktop file.")
} else {
	process.exit(0)
}

function getConfigPath() {
	const electronBuilderConfigJsPath = path.join(process.cwd(), "electron-builder-config.js")
	const electronBuilderConfigJson5Path = path.join(process.cwd(), "electron-builder.json5")
	const electronBuilderConfigJsonPath = path.join(process.cwd(), "electron-builder.json")
	const existingPath = fsSync.existsSync(electronBuilderConfigJsPath)
		? electronBuilderConfigJsPath
		: fsSync.existsSync(electronBuilderConfigJsonPath)
			? electronBuilderConfigJsonPath
			: fsSync.existsSync(electronBuilderConfigJson5Path)
				? electronBuilderConfigJson5Path
				: undefined
	if (!existingPath) {
		throw new Error(crop`Electron builder config file could not be found at the default locations. If you are using a different file path, please pass it as the second argument.

			Default search locations:
				- electron-builder-config.js (this cannot be named electron-builder.js, see, https://github.com/electron-userland/electron-builder/issues/6227)
				- electron-builder.json5
				- electron-builder.json
			`
		)
	} else {
		// eslint-disable-next-line no-console
		console.log(`Using config path ${existingPath}.`)
	}
	return existingPath
}

async function getConfig(pathOverride) {
	const configPath = pathOverride ?? getConfigPath()
	/** @type {import("electron-builder").Configuration} */
	let config
	if (configPath.endsWith(".js")) {
		config = (await import(configPath)).default
	} else {
		config = JSON5.parse(await fs.readFile(configPath, "utf-8"))
	}
	if (process.env.DEBUG) {
		// eslint-disable-next-line no-console
		console.log(config)
	}
	return config
}

const configPathOverride = process.argv[4]

const config = await getConfig(configPathOverride)

const desktopFile = config.linux?.desktop

desktopFile.Path = process.cwd()
desktopFile.Exec = process.argv[3] ?? `npm run launch:electron "%u"`
// desktopFile.Exec = `bash -c 'cd ${process.cwd()} && ${process.argv[3] ?? `npm run launch:electron %u'`}`
const contents = `[Desktop Entry]\n${
	Object.entries(desktopFile).map(([key, value]) => `${key}=${value}`).join("\n")}`
const appName = process.argv[2]

if (!appName) {
	throw new Error("You must pass the app name as the first argument.")
}
if (!process.env.HOME) {
	throw new Error("HOME environment variable is not set.")
}

const filepath = path.resolve(process.env.HOME, `./.local/share/applications/dev-${appName}.desktop`)

await run(`xdg-desktop-menu uninstall ${filepath}`).promise
// eslint-disable-next-line no-console
	.catch((err) => { console.log(err) })

await fs.writeFile(filepath, contents)
await fs.chmod(filepath, "755")

await run(`xdg-desktop-menu install ${filepath}`).promise

	.catch((err) => {
		// eslint-disable-next-line no-console
		console.log(err)
		process.exit(1)
	})
