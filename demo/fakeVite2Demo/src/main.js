// import { msg } from '@my-virtual-module'
// import foo from '@foo'
// import f from './foo'
// import batman from "data:text/javascript;, export default 'hi, batmannnn'"
// import { flatMap } from 'lodash-es'
// import debug from 'debug'
// let log = debug('app:logging')
// log('testing logging')
// import './main.css'
// import './foo.css'
// import bar from './style.module.css'
// import './style.module.css'
// import text from './helo.txt'
// console.log(text)
// foo()
// f()

// console.log('helo, world!')
// console.log(batman)
// console.log(`flatmap: ${flatMap(['1', [2, 3]])}`)

const ms = import.meta.globEagerDefault('./foo*.js')
for(const p in ms) {
	ms[p]().then(mod => {
		mod.default()
	})
}

// import('./foo').then(m => {
// 	m.default()
// })


console.log('helo, main')

if(import.meta.hot) {
	import.meta.hot.accept('./foo', (m) => {
		console.log('hmr foo updated');
		m.default()
	})
}