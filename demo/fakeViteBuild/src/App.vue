<template>
	<div class="red">Hello, {{ name }}</div>
</template>
<script>
import { ref } from 'vue'

export default {
	setup() {
		let name = ref('world!')
		return {
			name
		}
	}
}
</script>
<style scoped>
.red {
	color: red;
}
</style>