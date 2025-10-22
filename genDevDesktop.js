import { run } from "@alanscodelog/utils/run"
import JSON5 from "json5"
import fs from "node:fs/promises"
import path from "node:path"

if (process.env.CI) {
	console.log("Skipping desktop file generation in CI.")
	process.exit(0)
}

if (["darwin", "linux"].includes(process.platform)) {
	// eslint-disable-next-line no-console
	console.log("Generating dev desktop file.")
} else {
	process.exit(0)
}

const electronBuilderConfigPath = path.join(process.cwd(), "electron-builder.json5")
const electronBuilderConfig = JSON5.parse(await fs.readFile(electronBuilderConfigPath, "utf8"))

const desktopFile = electronBuilderConfig.linux?.desktop

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
