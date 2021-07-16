const { createVNode, vShow, withDirectives, createApp, Fragment, reactive, ref, h, Teleport } = Vue
// const App = {
// 	template: `
// 	<h2>Vue3 Demo</h2>
// 	<button @click="handleTeleportClick">Click Me</button>
// 	<Teleport to="body">
// 		<div v-show="!disabled">Helo,world!</div>
// 	</Teleport>
// 	`,
// 	setup(props, {slots, attrs, emit}) {
// 		const state = reactive({
// 			name: 'world'
// 		});
// 		const greetText = ref('');
// 		const disabled = ref(true)
// 		const handleTeleportClick = () => {
// 			disabled.value = !disabled.value
// 			console.log(disabled.value)
// 		}
// 		return {
// 			greetText,
// 			state,
// 			handleGreetClick: () => console.log('handle greet click'),
// 			disabled,
// 			handleTeleportClick
// 		}
// 	}
// }
const App = {
	setup(props, { slots, attrs, emit }) {
		const state = reactive({
			name: 'world'
		});
		const greetText = ref('');
		const disabled = ref(true)
		const handleTeleportClick = () => {
			disabled.value = !disabled.value
		}
		return () => (
			<>
				<div>Helo, world!</div>
			</>
		)
		// return () => {
		// 	return createVNode(Fragment, null, [
		// 		createVNode('h2', null, 'Vue3 Demo'),
		// 		createVNode('button', {
		// 			onClick: handleTeleportClick
		// 		}, 'Click Me'),
		// 		createVNode(Teleport, {
		// 			to: "body"
		// 		}, [withDirectives(createVNode('div', null, 'Helo, world!'), [
		// 			[vShow, !disabled.value]
		// 		])])
		// 	])
		// }
	}
}
const proxy = createApp(App).mount('#app')