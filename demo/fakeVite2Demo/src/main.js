import { msg } from '@my-virtual-module'
import foo from '@foo'
import f from './foo'
// import bar from './style.module.css'
// import './style.module.css'
// import text from './helo.txt'
// console.log(text)
foo()
f()
console.log('helo, world!')

// if(import.meta.hot) {
	import.meta.hot.accept('./foo', (m) => {
		console.log('hmr foo updated');
		m.default()
	})
// }
