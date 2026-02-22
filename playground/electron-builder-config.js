// https://www.electron.build/configuration/configuration
// do not name this file electron-builder.js (https://github.com/electron-userland/electron-builder/issues/6227)

/** This config shows how to use the two package.json build strategy to control which dependencies are packaged. I've tested this with pnpm in a workspaced project and it works. No need to hoist anything either. See also app-electron/package.json. */

import path from "node:path"

import packageJson from "./package.json" with { type: "json" }

const appName = packageJson.name

// There should be a package.json here with at least the dependencies needed for electron main.
const appDirectory = "app-electron"

const appDirectoryToRoot = path.relative(path.resolve(appDirectory), path.resolve("./"))

/**
 * @param {string[]} files
 * @returns {import('electron-builder').FileMapping[]}
 */
function mapRootFiles(files) {
	const res = files.map(file => ({
		from: `${appDirectoryToRoot}/${file}`,
		to: file,
		filter: ["**/*"]
	}))
	return res
}

// https://www.electron.build/configuration/configuration
/** @type {import('electron-builder').Configuration} */
export default {
	appId: `com.electron.${appName}`,
	productName: appName,
	executableName: appName,
	asar: true,
	directories: {
		app: appDirectory,
		output: ".dist/electron/release"
	},
	extraMetadata: {
		// or you can use a pick util
		...Object.fromEntries([
			"name",
			"version",
			"type",
			"description",
			"author",
			"repository",
			"dependencies",
			// note we can keep main from the main package json because of how we copy paths below
			"main"
		].map(key => [key, packageJson[key]]))
	},
	files: [
		// note only this from/to object version will work for copying files outside of the app directory
		// idk why we must copy the package.json, but we must
		// we just copy main even though it's technically wrong
		{
			// doing from: package.json does not work
			from: `${appDirectoryToRoot}/`,
			to: "",
			filter: ["package.json"]
		},
		...mapRootFiles([
			".dist/electron/build",
			".dist/electron/.output/public"
		])
	],
	linux: {
		artifactName: "${productName}_${version}.${ext}",
		target: ["dir"]
	},
	mac: {
		artifactName: "${productName}_${version}.${ext}",
		target: ["dmg"]
	},
	win: {
		target: [{ target: "nsis", arch: ["x64"] }],
		artifactName: "${productName}_${version}.${ext}"
	},
	nsis: {
		oneClick: false,
		perMachine: false,
		allowToChangeInstallationDirectory: true,
		deleteAppDataOnUninstall: false
	}
}
