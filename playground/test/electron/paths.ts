import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { localhostUrl } from "@witchcraft/nuxt-electron/electron/test"

/** The playground root, the electron process cwd. */
export const playgroundDir = fileURLToPath(new URL("../..", import.meta.url))

/** The production build of the playground app, made with `pnpm build:electron:no-pack`. */
export const mainEntry = fileURLToPath(new URL("../../.dist/electron/build/main.mjs", import.meta.url))

/** The server the app talks to. */
export const serverUrl = localhostUrl()

/** A fresh profile dir in the playground (gitignored) so runs can be inspected. */
export function profileDir(name: string): string {
	return fileURLToPath(new URL(`../../${name}`, import.meta.url))
}

export function assertBuilt(): void {
	if (!existsSync(mainEntry)) {
		throw new Error(`Missing ${mainEntry}, run \`pnpm build:electron:no-pack\` in playground first.`)
	}
	if (!process.env.NUXT_PORT) {
		throw new Error("NUXT_PORT is not set, the test server port must be known to point the app at it.")
	}
}
