<template>
<WButton
	:border="false"
	aria-label="Close"
	class="
			p-0
			[&:hover_.default-icon:after]:bg-accent-500
			[&:hover_.default-icon:before]:bg-accent-500
[&:hover_.default-icon:after]:shadow-xs
			[&:hover_.default-icon:after]:shadow-fg/50
			[&:hover_.default-icon:before]:shadow-xs
			[&:hover_.default-icon:before]:shadow-fg/50

		"
	@click="emit('action', 'close')"
>
	<slot>
		<div
			class="
			default-icon
			relative
			w-[calc(var(--electron-wc-size)-var(--electron-wc-border)/2)]
			h-[calc(var(--electron-wc-size)-var(--electron-wc-border)/2)]
			before:absolute
			before:content-['']
			before:left-0
			before:rotate-45
			before:origin-left
			before:top-[calc(var(--electron-wc-border)/-2)]
			before:w-[var(--electron-wc-diagonal)]
			before:h-[var(--electron-wc-border)]
			before:rounded-(--electron-wc-rounded)
			before:bg-fg
			dark:before:bg-bg
			after:absolute
			after:content-['']
			after:origin-top
			after:right-[calc(var(--electron-wc-border)/-2)]
			after:top-0
			after:rotate-[45deg]
			after:h-[var(--electron-wc-diagonal)]
			after:w-[var(--electron-wc-border)]
			after:bg-fg
			after:rounded-(--electron-wc-rounded)
			dark:after:bg-bg
		"
		/>
	</slot>
</WButton>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
	(e: "action", action: "close"): void
}>()
</script>
