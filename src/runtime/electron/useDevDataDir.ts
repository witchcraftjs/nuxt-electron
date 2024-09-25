export function useDevDataDir(): string | undefined {
	if (process.env.NODE_ENV === "development") {
		const index = process.argv.findIndex(arg => arg.startsWith("--user-data-dir")) + 1
		if (index === -1) return undefined
		return process.argv[index + 1]
	}
	return undefined
}

