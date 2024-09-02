class Store() {
	constructor({state, getters, mutations, actions}) {
		this.state = reactive(state)
		this.mutations = mutations
		this.actions = actions
		this.getters = []
		for([k, fn] of Object.entries(getters)) {
			this.getters[k] = computed(() => fn(this.state)).value // vue3
			Object.prototype.defineProperty(this.getters, k, {
				value: () => computed(() => fn(this.state)).value
			})
		}
		// getters: { count: (state) => state.count + 1}
	}
	/* mutations: {
		increment(state, payload) {
			state.count = state.count +payload
		},
	}
	*/
	commit(handlerName, payload) { // commit(name, payload)
		const handler = this.mutations[handlerName]
		if(!handler) throw new Error(`${handlerName}'s handler is not exist`)
		handler(this.state, payload)
	}
	dispatch(handlerName, payload) { // return Promise
		const handler = this.actions[handlerName]
		if(!handler) throw new Error(`${handlerName}'s handler is not exist`)
		const result = handler(this, payload)
		if(!isPromise(result))	return Promise.resolve(result)
		return result
	}
	install(app, store) { // app.use(store, store)
		app.config.globalProperties.$store = store
	}
}