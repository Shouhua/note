import browserDebug from 'debug'

const appDebug = new browserDebug('app')
const fooDebug = new browserDebug('foo')

export {
	appDebug,
	fooDebug
}