<template>
	<h1>helo world!!</h1>
	<div class="red">{{ count }}</div>
	<button @click="handleClick">Click</button>
</template>

<script>
import {ref} from 'vue'

export default {
	setup() {
		let count = ref(0)
		return {
			count,
			handleClick: () => count.value += 10
		}
	}
}
</script>

<style>
.red {
	color: red;
	font-size: 60px;
}
</style>