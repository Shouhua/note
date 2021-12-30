export default function foo() {
	console.log('foo000000000dsfadfasdsdasd');
	import('./foobar').then(m => {
		m.default()
	})
}