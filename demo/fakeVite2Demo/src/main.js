import { msg } from '@my-virtual-module'
import foo from '@foo'
import f from './foo'
// import batman from "data:text/javascript;, export default 'hi, batmannnn'"
import { flatMap } from 'lodash-es'
import debug from 'debug'
let log = debug('app:logging')
log('testing logging')
// import bar from './style.module.css'
// import './style.module.css'
// import text from './helo.txt'
// console.log(text)
foo()
f()

console.log('helo, world!')
// console.log(batman)
console.log(`flatmap: ${flatMap(['1', [2, 3]])}`)

if(import.meta.hot) {
	import.meta.hot.accept('./foo', (m) => {
		console.log('hmr foo updated');
		m.default()
	})
}