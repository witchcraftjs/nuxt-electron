import packageJson from "../package.json" with { type: "json" }

const electronMainDependencies = Object.keys(packageJson.dependencies)

// https://www.electron.build/configuration/configuration
/** @type {import('electron-builder').Configuration} */
export default {
	appId: "com.electron.app",
	productName: "your-app-name",
	executableName: "your-app-name",
	asar: true,
	directories: {
		output: ".dist/electron/release"
	},
	files: [
		".dist/electron/build/**/*",
		".dist/electron/.output/public/**/*",
		// for nix only
		"!**/.direnv/*",
		"!**/.devenv/*",

		// if we let it, the builder will copy all dependencies listed in the main package.json
		// which includes things for the client, the server, etc
		// the server we can ignore, the client is packaged already by nuxt
		// we only need the dependencies electron's main needs
		// these are listed in the electron layer's package.json
		"!node_modules",
		"!node_modules/.pnpm",
		...electronMainDependencies.map(dep => "!node_modules/" + dep + "/**/*")
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
	},
	// temporary workaround for the fact we don't have a version
	extraMetadata: {
		version: "process.env.APP_VERSION"
	}
}
