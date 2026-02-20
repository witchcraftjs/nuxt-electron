<!-- <template> -->
<!-- <div> -->
<!-- 	404 Error -->
<!-- 	<NuxtLink to="/app"> -->
<!-- 		Go back to /app -->
<!-- 	</NuxtLink> -->
<!-- </div> -->
<!-- </template> -->

<script setup lang="ts">
import type { NuxtError } from "#app"

defineProps({
	error: Object as () => NuxtError
})

const handleError = () => clearError({ redirect: isElectron() ? "/app" : "/" })
</script>

<template>
<div>
	<h2>{{ error?.status }}</h2>
	<button @click="handleError">
		Clear errors (on electron this should redirect to /app)
	</button>
</div>
</template>
