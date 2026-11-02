/**
 * The preload script can be passed arguments using the `webPreferences.additionalArguments` option.
 *
 * ````ts [main.ts]
 * const meta = { ... }
 *
 * const win = new BrowserWindow({
 * 	webPreferences: {
 * 		additionalArguments: [
 * 			// you can change which key is used
 * 			`--metadata=${JSON.stringify(meta)}`,
 * 		],
 * 	},
 * })
 * ```
 *
 * ````ts [preload.ts]
 * const meta = getPreloadMeta<Meta>("metadata")
 * ```
 *
 * This function can be used to get the metadata and type it in the preload script.
 *
 * Note that if it can't find the argument or there is an error parsing the json, it will throw.
 */
export function getPreloadMeta<T>(
	key: string
): T {
	const meta = process.argv
		.find(arg => arg.startsWith(`--${key}=`))
		?.split("=")?.[1]

	if (!meta) {
		throw new Error("No metadata passed to renderer.")
	}
	return JSON.parse(meta)
}
