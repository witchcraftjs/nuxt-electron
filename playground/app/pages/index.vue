<template>
<div>
	Web Only
</div>
</template>

<script setup lang="ts">
if (isElectron()) {
	await navigateTo("/app")
}
</script>
