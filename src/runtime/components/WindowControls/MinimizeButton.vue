<template>
<WButton
	:border="false"
	aria-label="Minimize"
	class="
			p-0
			[&:hover_.default-icon:after]:bg-accent-500
			[&:hover_.default-icon:after]:shadow-xs
			[&:hover_.default-icon:after]:shadow-fg/50
		"
	@click="emit('action', 'minimize')"
>
	<slot>
		<div
			class="
			default-icon
			border-fg
			dark:border-bg
			w-[var(--electron-wc-size)]
			h-[var(--electron-wc-size)]
			relative
			after:absolute
			after:content-['']
			after:bottom-0
			after:left-0
			after:w-[var(--electron-wc-size)]
			after:h-[var(--electron-wc-border)]
			after:rounded-(--electron-wc-rounded)
			after:bg-fg
			dark:after:bg-bg

		"
		/>
	</slot>
</WButton>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
	(e: "action", action: "minimize"): void
}>()
</script>
