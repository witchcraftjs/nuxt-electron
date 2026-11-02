/**
 * Creates a protocol scheme to register as privileged with the following permissions (you can override them with the second parameter).
 *
 * Note this must be called before the app's ready event:
 *
 * ```ts
 * protocol.registerSchemesAsPrivileged([
 * 	createPrivilegedProtocolScheme("app")
 * })
 * ```
 *
 * ## Privileges
 *
 * Basically all except `bypassCSP` and `enableCORS`.
 *
 * - `standard`
 * - `allowServiceWorkers`
 * - `bypassCSP`
 * - `corsEnabled`
 * - `secure`
 * - `supportFetchAPI`
 * - `codeCache`
 * - `stream`
 */
export function createPrivilegedProtocolScheme(protocolName: string, privileges: Partial<Electron.CustomScheme["privileges"]> = {}): Electron.CustomScheme {
	return {
		scheme: protocolName,
		privileges: {
			bypassCSP: false,
			corsEnabled: false,
			stream: false,
			standard: true,
			secure: true,
			supportFetchAPI: true,
			allowServiceWorkers: true,
			codeCache: true,
			...privileges
		}
	}
}
