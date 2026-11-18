import { expect, test } from "@playwright/test"
import { localhostUrl } from "@witchcraft/nuxt-electron/electron/test"

test("localhostUrl helper works with NUXT_PORT and local cert envs", () => {
	const savedPort = process.env.NUXT_PORT
	const savedKey = process.env.LOCALHOST_KEY_PEM
	const savedCert = process.env.LOCALHOST_PEM
	try {
		process.env.NUXT_PORT = "1234"
		delete process.env.LOCALHOST_KEY_PEM
		delete process.env.LOCALHOST_PEM

		expect(localhostUrl()).toBe("http://localhost:1234")
		expect(localhostUrl("4000")).toBe("http://localhost:4000")
		expect(localhostUrl(4000)).toBe("http://localhost:4000")

		process.env.LOCALHOST_KEY_PEM = "/key.pem"
		process.env.LOCALHOST_PEM = "/cert.pem"
		expect(localhostUrl()).toBe("https://localhost:1234")

		delete process.env.NUXT_PORT
		delete process.env.LOCALHOST_KEY_PEM
		delete process.env.LOCALHOST_PEM
		expect(() => localhostUrl()).toThrow("localhostUrl: pass a port or set NUXT_PORT.")
		expect(localhostUrl("4000")).toBe("http://localhost:4000")
	} finally {
		if (savedPort === undefined) delete process.env.NUXT_PORT
		else process.env.NUXT_PORT = savedPort
		if (savedKey === undefined) delete process.env.LOCALHOST_KEY_PEM
		else process.env.LOCALHOST_KEY_PEM = savedKey
		if (savedCert === undefined) delete process.env.LOCALHOST_PEM
		else process.env.LOCALHOST_PEM = savedCert
	}
})
