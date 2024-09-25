<template>
<div>
	Web Only
</div>
</template>

<script setup lang="ts">
console.log(useIsElectron())
if (useIsElectron()) {
	console.log("electron")
	navigateTo("/app")
}
</script>
