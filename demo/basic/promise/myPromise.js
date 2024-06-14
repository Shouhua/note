class MyPromise {
	constructor(fn) {
		this.status = 'pending' // pending, fulfilled, rejected
		this.value = null
		this.fulfilledCallbacks = []
		this.rejectedCallbacks = []
		const resolve = (val) => {
			if(this.status === 'pending') {
				this.status = 'fulfilled'
				this.value = val
				this.fulfilledCallbacks.forEach(cb => {
					cb(val)
				})
			}
		}
		const reject = (reason) => {
			if(this.status === 'pending') {
				this.status = 'rejected'
				this.value = reason
				this.rejectedCallbacks.forEach(cb => {
					cb(reason)
				})
			}
		}
		try {
			fn(resolve, reject)
		} catch (err) {
			reject(err)
		}
	}
	static resolve(val) {
		if(val instanceof MyPromise) 
			return val
		return new MyPromise((res, rej) => {
			res(val)
		})	
	}
	then(onFulfilled, onRejected) {
		if(typeof onFulfilled !== 'function') onFulfilled = () => onFulfilled
		if(typeof onRejected !== 'function') onRejected = () => onRejected
		return new MyPromise((resolve, reject) => {
			if(this.status === 'pending') { // 添加函数
				this.fulfilledCallbacks.push(() => {
					try {
						const resultPromise = onFulfilled(this.value)
						 // 如果得到结果是Promise，需要等待结果
						if(resultPromise instanceof MyPromise)
							resultPromise.then(resolve, reject)
						resolve(resultPromise)
					} catch (err) {
						reject(err)
					}
				})
				this.rejectedCallbacks.push(() => {
					try {
						const resultPromise = onRejected(this.value)
						if(resultPromise instanceof MyPromise)
							resultPromise.then(resolve, reject)
						reject(resultPromise)
					} catch (err) {
						reject(err)
					}
				})
			}
			if(this.status === 'fulfilled') {
				try {
					const resultPromise = onFulfilled(this.value)
					if(resultPromise instanceof MyPromise)
						resultPromise.then(resolve, reject)
					resolve(resultPromise)
				} catch (err) {
					reject(err)
				}
			}
			if(this.status === 'rejected') {
				try {
					const resultPromise = onRejected(this.value)
					if(resultPromise instanceof MyPromise)
						resultPromise.then(resolve, reject)
					reject(resultPromise)
				} catch (err) {
					reject(err)
				}
			}
		})
		// this.fulfilledCallbacks.push(cb)
	}
	catch(cb) { // then(undefined, cb)的简写 
		return this.then(null, cb)
	}
	get [Symbol.toStringTag]() {
		return 'MyPromise'
	}
	toString() {
		if(this.status === 'pending') {
			return `status: ${this.status}`
		} else if(this.status === 'fulfilled') {
			return `status: ${this.status}, value: ${this.value}`
		} else {
			return `status: ${this.status}, reason: ${this.value}`
		}
	}
}

const p = new MyPromise((resolve, reject) => {
	setTimeout(() => {
		resolve('success')	
	}, 100);
})
console.log(Object.prototype.toString.call(p))
console.log(p.toString())
p.then((val) => {console.log(val);return 123}).then((val) => console.log(`${val} again`))

