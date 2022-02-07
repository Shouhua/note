const loadScript = (file) => {
	const script = await import(file)
	return script.default || script
}

const registerRoute = (route, router) => {
	router.addRoute(...route)
}

export {
	loadScript,
	registerRoute
}