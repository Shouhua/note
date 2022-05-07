function Foo (name) {
	this.name = name
}
Foo.prototype.myName = function () {
	return this.name
}
function Bar (name, label) {
	this.label = label
	Foo.call(this, name)
}

Bar.prototype = Object.create(Foo.prototype)
Bar.prototype.constructor = Bar

Bar.prototype.myLabel = function () {
	return this.label
}

var a = new Bar('a', 'obj a')
a.myName()
a.myLabel()

class Foo {
	constructor(name) {
		this.name = name
	}
	myName() {
		return this.name
	}
}

class Bar extends Foo {
	constructor(name, label) {
		super(name)
		this.label = label
	}
	myLabel() {
		return this.label
	}
}

let bar = new Bar('bar', 'bar label')
bar instanceof Foo
bar.myLabel()
bar.myName()