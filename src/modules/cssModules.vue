<template>
	<p class="test" :class="$style.helo">helo, style module</p>
	<p :class="style1.normal">helo, normal module</p>
	<p class="yellow">hello, import style</p>
	<button @click="handleClick">change font size</button>
</template>
<script>
import { ref } from 'vue'
import style1 from './style.module.css'
import style2 from './style.css'

console.log(style1, style2)
console.log(process.env.NODE_ENV)
if(process.env.NODE_ENV === 'development') {
	console.log('developemnt envrionment...');
}

export default {
	setup() {
		const fontSize = ref('18px')
		return {
			fontSize,
			style1,
			handleClick() {
				fontSize.value = fontSize.value === '14px' ? '20px' : '14px'
			}
		}
	}
}
</script>
<style module>
.helo {
	color: red;
}
</style>
<style>
.test {
	font-size: v-bind(fontSize);
}
</style>
<style lang="scss">
.foo {
	color: lightblue
}
</style>
<style scoped lang="scss">
.bar {
	color: lightblue
}
</style>