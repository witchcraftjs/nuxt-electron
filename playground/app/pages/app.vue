<template>
Electron Only
<div>
	Server Api Call:
	<div>
		{{ data ?? error ?? status }}
	</div>
</div>
<NuxtLink to="/serverOnly">Server Only</NuxtLink>
</template>
<script lang="ts" setup>
/** Optional @witchcraft/nuxt-logger usage */
setupElectronMainToRendererLogging()
const logger = useLogger()
logger.debug({ ns: "renderer:hello" })
const { data, error, status } = useAsyncData("test", () => $fetch("/api/test"), { server: false, getCachedData: () => undefined })
</script>
