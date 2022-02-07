<template>
	<h2 class="red">Hello, Multiple entry!</h2>
	<p>
		<router-link to="/">Go to Home</router-link>
		<router-link to="/about">Go to About</router-link>
	</p>
	<router-view></router-view>
</template>

<script>
export default {
	setup() {
		return { }
	}
}
</script>

<style>
.red {
	color: red;
}
</style>