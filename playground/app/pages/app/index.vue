<template>
<div style="display: flex; flex-direction: column; gap: 2rem;">
	Electron Only
	<div>
		<div>
			Server Api Call:
		</div>
		<button @click="refresh()">
			Refresh
		</button>
		<div>
			{{ data ?? error ?? status }}
		</div>
	</div>
	<div>
		<div>
			Ping/Pong API Test:
		</div>
		<div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
			<button @click="sendPing()">
				Send Ping
			</button>
			<button @click="sendPing({ prefix: true })">
				Send Ping (prefixed)
			</button>
		</div>
		<div>
			{{ pingPongResult ?? "Click button to test" }}
		</div>
	</div>
	<div style="display: flex; flex-direction: column; gap: 2rem;">
		<NuxtLink to="/app/other-app-page">
			Go to /app/other-app-page (should work)
		</NuxtLink>

		<NuxtLink to="/spa">
			Go to /spa (should work)
		</NuxtLink>

		<NuxtLink to="/other-page-prerendered">
			Go to pre-rendered, included, other-page-prerendered (should work)
		</NuxtLink>

		<NuxtLink to="/other-page">
			Go to non-prerendered, non-included /other-page (should go to 404)
		</NuxtLink>
	</div>
</div>
</template>

<script lang="ts" setup>
import { useAsyncData } from "nuxt/app"

/** Optional @witchcraft/nuxt-logger usage */
setupElectronMainToRendererLogging()
const logger = useLogger()
logger.debug({ ns: "renderer:hello" })
const { data, error, status, refresh } = await useAsyncData("test", () => $fetch("/api/test"), { server: false, getCachedData: () => undefined })

// Ping/Pong API test
const pingPongResult = ref<string | null>(null)

const sendPing = async ({ prefix }: { prefix?: boolean } = {}) => {
	pingPongResult.value = "Sending ping..."
	try {
		const result = prefix
			? await window.electron.api.prefixed.ping("message")
			: await window.electron.api.ping("message")
		pingPongResult.value = `Result: ${result}`
	} catch (e) {
		pingPongResult.value = `Error: ${e}`
	}
}
</script>
