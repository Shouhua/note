// five base types: null undefined boolean number string
// object: Object, Function, Array, Date等
let basicTypes = [null, undefined, true, 123, 'hello']

// for(let index in basicTypes) {
// 	console.log(`${basicTypes[index]}: ${typeof basicTypes[index]}`)
// }

// 判断是否是Object，只是判断基本类型和对象类型
const isObject = (obj) => typeof obj === 'object' && obj !== null

const getObjectType = (obj) => {
	return Object.prototype.toString.call(obj)
}
const isObjectType = (obj, type) => {
	return getObjectType(obj).slice(8, -1) === type
}
// console.log(isObjectType({}, "Object"))
// console.log(`{}: ${printObjectType({})}`)
// console.log(`[]: ${printObjectType([])}`)
// console.log(`function: ${printObjectType(function(){})}`)
// console.log(`Date: ${printObjectType(Date)}`) // [object, Function]
// console.log(`Date: ${printObjectType(new Date())}`) // [object, Date]
// console.log(`Date: ${printObjectType(new Boolean())}`) // [object, Boolean]
// console.log(`Date: ${printObjectType(Boolean())}`) // [object, Boolean]
// console.log(`Date: ${printObjectType(Boolean)}`) // [object, Function]

let obj = {
	a: null,
	b: {
			foo: 1,
			toString: () => "{foo: 1234234}" // console.log中使用``，默认使用Object.prototype.toString.call, 但是可以提供toString方法覆盖
	},
	null: "null",
	undefined: "undefined",
	[Symbol()]: "Symbol"	 // Symbol可以作为key，但是不能被enumerable
}

// for(let k in obj) {
// 	console.log(`${k}: ${obj[k]}`)
// }

// arguments不能在strict mode下使用，类似与数组的对象[object Arguments]
// 实现了[Symbol.iterator],可以使用for of，使用for in会给出可以1,2,3
// ;(function foobar() { console.log(typeof arguments); console.log(getObjectType(arguments)) })()

let obj1 = {
	a: {
		b: 1,
		c: [1, {foo: 111}],
		bar: null
	},
	d: null,
	e: [1, 2, {f: 1, g: 2}]
}

let result = {};
function flatternObj(obj, totalKey) {
	for(let key in obj) {
		let currentKey = totalKey + (Array.isArray(obj) ? `[${key}]` : (totalKey === '' ? `${key}`: `.${key}`))
		if(typeof obj[key] === 'number' || obj[key] === null)
			result[currentKey]= obj[key]
		else
			flatternObj(obj[key], currentKey)
	}
}


function flattern(obj) {
	if(!isObjectType(obj, 'Object')) return
	flatternObj(obj, '')
}

flattern(obj1)
// console.log(result)

var iterObj = {
	foo: 1, 
	bar: 2
}

iterObj[Symbol.iterator] = function() {
	let val = Object.values(this)
	let index = 0;
	let len;
	return {
		next: () => {
			return {
				value: val[index],
				done: index++ >= val.length
			}
		}
	}
}

// for(let i of iterObj) {
// 	console.log(i)
// }

var t = {'foo': 1}
var s = {'bar': {'foobar': 2}}

// function shallowCopy(target, source) {
// 	for(let k in source) {
// 		if(Object.prototype.hasOwnProperty.call(source, k)) {
// 			target[k] = source[k]
// 		}
// 	}
// }

// function deepCopy(target, source) {

// }

var arr = [1, 2, [3, 4, [5, 6]]];
Array.prototype.flat = function(n=1) {
	if(!Array.isArray(this)) return TypeError("不是数组");
	let raw = this
	let result = []
	let count = 0
	function wrap(a) {
		count++
		a.forEach(item => {
			if(!Array.isArray(item) || count>n)
				result.push(item)
			else
				wrap(item)
		})		
		count--
	}
	wrap(raw)
	return result
}
// console.log(arr.flat());      // [1, 2, 3, 4, [5, 6]]
// console.log(arr.flat(2));     // [1, 2, 3, 4, 5, 6]

function Foo() {
	this.name = 'James'
}

function Bar() {
	if(!new.target) 
		throw new TypeError('使用new初始化')
	Foo.call(this)
	this.age = 30
}

Bar.prototype = Object.create(Foo.prototype)
Bar.prototype.constructor = Bar

const bar = new Bar()
// console.log(bar.name, bar.age)

Array.prototype.myReduce = function(fn, initial) {
	// check function
	var raw = this
	let acc = initial
	let cur
	let count = raw.length
	let start = 0
	if(arguments.length == 1) {// no initial
		acc = a[0]
		start = 1
	}
	for(let i = start; i < count; i++) {
		cur = raw[i]
		acc = fn(acc, cur)	
	}
	return acc
}

const array1 = [1, 2, 3, 4];

// 0 + 1 + 2 + 3 + 4
const initialValue = 0;
const sumWithInitial = array1.myReduce(
  (accumulator, currentValue) => accumulator + currentValue, 10
);

console.log(sumWithInitial);