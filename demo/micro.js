/**
// 1. nginx server
// 2. webpack 
entry: {
	module1: './src/pages/module1.export.js'
	...
}
output: {
	library: 'globalMoudleName'
}

// 3. module export file
export default {
	module, routes, store
}
 */
const routes = [
	{
		path: '/module1',
		element: () => dynamicLoadComp(url, moduleName)
	}
];

function dynamicLoadComp(url) {
	const loadScriptPromise = new Promise((resolve, reject) => {
		// load script
		const script = document.createElement('script')
		script.src = `url?t=${Date.now()}`
		script.onload = () => resolve()
		script.onerror = () => reject()
	})
	return loadScriptPromise.then(() => {
		const asyncModule = window[moduleName].default
		registerRouter(asyncModule.routes)
		registerStore(asyncModule.store)
		return Promise.resolve(asyncModule.module)
	})
	.catch(() => {
		return Promise.reject('load script failed')
	})
}

let o = {
	name: o
}

function shallowCopy(obj) {
	let result = {}
	for(let key in obj) {
		if(!Object.hasOwn(obj, key)) continue
		result[key] = obj[key]
	}
	return result
}

/**
 * cache
 * key -> {origin, copy} 
 */
