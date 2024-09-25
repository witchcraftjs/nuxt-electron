export function useDevDataDir(): string | undefined {
	if (import.meta.dev) {
		const index = process.argv.findIndex(arg => arg.startsWith("--user-data-dir")) + 1
		if (index === -1) return undefined
		return process.argv[index + 1]
	}
	return undefined
}
