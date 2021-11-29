import bar from './bar.js'

export default function() {
	console.log('hello, foobar!');
	bar()
}

import.meta.hot.accept('./bar.js', (m)=>{
	m.default()
})

if(import.meta.hot) {
	import.meta.hot.accept('./bar.js', (m)=>{
		m.default()
	})
}