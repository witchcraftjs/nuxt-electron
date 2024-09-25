import { keys } from "@alanscodelog/utils/keys"
import { net } from "electron"
import path from "node:path"

export function createNuxtFileProtocolHandler(
	session: Electron.Session,
	basePath: string,
	/**
	 * If any route starts with one of these keys, it will get rerouted to the given value.
	 *
	 * At least `/api` should be added for a basic nuxt app to work correctly.
	 *
	 *
	 * ```ts
	 * routeProxies: {
	 * 	"/api": "http://localhost:3000/api",
	 * }
	 * ```
	 */
	routeProxies: Record<string, string>
): void {
	const routeProxyKeys = keys(routeProxies)
	session.protocol.handle("file", async request => {
		const url = decodeURIComponent(request.url.slice(7))
		const newUrl = path.isAbsolute(url)
			? path.resolve(basePath, url.slice(1))
			: path.resolve(basePath, url)

		const proxyKey = routeProxyKeys.find(key => url.startsWith(key))

		if (proxyKey) {
			const proxyUrl = routeProxies[proxyKey]
			return net.fetch(proxyUrl + url)
		}

		const res = await net.fetch(`file://${newUrl}`, {
			// avoid infinite loop
			bypassCustomProtocolHandlers: true
		}).catch(err => new Response(err, { status: 404 }))
		return res
	})
}
