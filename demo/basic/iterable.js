/**
 * iterable protocol 对象需要实现[Symbol.iterator]()函数，返回一个iterator对象
 * iterator protocol 对象需要实现next()函数，返回一个{done: Boolean, value: Type}对象
 * iterable protocol
 * [Symbol.iterator]() {
 * 	return {
 * 	next() {
 * return { // iterator protocol
	 done: Boolean,
	 value: Type
 }
 * }
 * }
 * }
 */

class Range {
	constructor(start, end, step = 1) {
		this.start = start
		this.end = end
		this.step = step
	}
	[Symbol.iterator]() {
		let val = this.start
		let result;
		return {
			next: () => {
				if (val >= this.end) {
					return { done: true }
				}
				result = { done: false, value: val }
				val += this.step
				return result
			}
		}
	}
}

const range = new Range(1, 5)

for (let i of range)
	console.log(i)