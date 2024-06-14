/*
// 都完成promiseObj1才resolved，有一个reject就返回地一个reason
const promiseObj1 = Promise.all() 
// 只要有一个resolved就返回，全部reject才返回reject
const promiseObj2 = Promise.any() 

// 当所有的promise完成或者reject后才返回，可以在then里面查看所有promise的状态和值
const promiseObj3 = Promise.allSettled([]) 
promiseObj3.then((results: [{type, value, reason}]) => {})
// 多个Promise竞争，第一个不管resolve还是reject都返回，可以用于请求超时场景
const promiseObj = Promise.race([
	fetch('https://abc.com'),
	new Promise((_, reject) => {
		setTimeout(() => { reject(new Error('5s超时了'))}, 5000)
	})
])
*/
// version 1
/*
export class FakePromise {
	constructor(handler) {
		this.status = 'pending'
		this.value = null
		const resolve = (value) => {
			this.status = 'fulfilled'
			this.value = value
		}
		const reject = (value) => {
			this.status = 'rejected'
			this.value = value
		}
		try {
			handler(resolve, reject)	
		} catch (err) {
			reject(err)
		}
	}
	then(onFulfilled, onRejected) {
		if(this.status === 'fulfilled') {
			onFulfilled(this.value)
		}
		if(this.status === 'rejected') {
			onRejected(this.value)
		}
	}
}
*/
// version 2 支持异步操作
// 异步操作执行后需要判断此时的状态，因为很有可能状态被改变了
// 在resolve时候执行收集到的callback
/*
export class FakePromise {
	constructor(handler) {
		this.status = 'pending'
		this.value = null
		this.onFulfilledCallbacks = []
		this.onRejectedCallbacks = []

		const resolve = (value) => {
			if(this.status === 'pending') {
				this.status = 'fulfilled'
				this.value = value
				this.onFulfilledCallbacks.forEach(fn => fn(value))
			}
		}
		const reject = (value) => {
			if(this.status === 'pending') {
				this.status = 'rejected'
				this.value = value
				this.onRejectedCallbacks.forEach(fn => fn(value))
			}
		}
		try {
			handler(resolve, reject)	
		} catch (err) {
			reject(err)
		}
	}
	then(onFulfilled, onRejected) {
		if(this.status === 'pending') {
			this.onFulfilledCallbacks.push(onFulfilled)
			this.onRejectedCallbacks.push(onRejected)
		}
		if(this.status === 'fulfilled') {
			onFulfilled(this.value)
		}
		if(this.status === 'rejected') {
			onRejected(this.value)
		}
	}
}
*/
// version 3 支持chain then
/*
export class FakePromise {
	constructor(handler) {
		this.status = 'pending'
		this.value = null
		this.onFulfilledCallbacks = []
		this.onRejectedCallbacks = []

		const resolve = (value) => {
			if(this.status === 'pending') {
				this.status = 'fulfilled'
				this.value = value
				this.onFulfilledCallbacks.forEach(fn => fn(value))
			}
		}
		const reject = (value) => {
			if(this.status === 'pending') {
				this.status = 'rejected'
				this.value = value
				this.onRejectedCallbacks.forEach(fn => fn(value))
			}
		}
		try {
			handler(resolve, reject)	
		} catch (err) {
			reject(err)
		}
	}
	then(onFulfilled, onRejected) {
    return new Promise((resolve, reject) => {
        if (this.status === "pending") {
            this.onFulfilledCallbacks.push(() => {
                try {
                    const fulfilledFromLastPromise = onFulfilled(this.value);
                    resolve(fulfilledFromLastPromise);
                } catch (err) {
                    reject(err);
                }
            });
            this.onRejectedCallbacks.push(() => {
                try {
                    const rejectedFromLastPromise = onRejected(this.value);
                    reject(rejectedFromLastPromise);
                } catch (err) {
                    reject(err);
                }
            });
        }

        if (this.status === "fulfilled") {
            try {
                const fulfilledFromLastPromise = onFulfilled(this.value);
                resolve(fulfilledFromLastPromise);
            } catch (err) {
                reject(err);
            }

        }

        if (this.status === "rejected") {
            try {
                const rejectedFromLastPromise = onRejected(this.value);
                reject(rejectedFromLastPromise);
            } catch (err) {
                reject(err);
            }
        }
    });
	}
}
*/

// version 4 return promise in then
export class FakePromise {
	constructor(handler) {
		this.status = 'pending'
		this.value = null
		this.onFulfilledCallbacks = []
		this.onRejectedCallbacks = []

		const resolve = (value) => {
			if(this.status === 'pending') {
				this.status = 'fulfilled'
				this.value = value
				this.onFulfilledCallbacks.forEach(fn => fn(value))
			}
		}
		const reject = (value) => {
			if(this.status === 'pending') {
				this.status = 'rejected'
				this.value = value
				this.onRejectedCallbacks.forEach(fn => fn(value))
			}
		}
		try {
			handler(resolve, reject)	
		} catch (err) {
			reject(err)
		}
	}
	then(onFulfilled, onRejected) {
		return new FakePromise((resolve, reject) => {
			if(this.status === 'pending') {
				this.onFulfilledCallbacks.push(() => {
					try {
						const fulfilledFromLastPromise = onFulfilled(this.value)
						if(fulfilledFromLastPromise instanceof FakePromise) {
							fulfilledFromLastPromise.then(resolve, reject)
						} else {
							resolve(fulfilledFromLastPromise)
						}
					} catch (err) {
						rejecet(err)
					}
				})
				this.onRejectedCallbacks.push(() => {
					try {
						const rejectedFromLastPromise = onRejected(this.value)
						if(rejectedFromLastPromise instanceof FakePromise) {
							rejectedFromLastPromise.then(resolve, reject)	
						} else {
							reject(rejectedFromLastPromise)
						}
					} catch (err) {
						reject(err)
					}
				})
			}
			if(this.status === 'fulfilled') {
				try {
					const fulfilledFromLastPromise = onFulfilled(this.value)
						if(fulfilledFromLastPromise instanceof FakePromise) {
							fulfilledFromLastPromise.then(resolve, reject)
						} else {
							resolve(fulfilledFromLastPromise)
						}
				} catch (err) {
					reject(err)
				}
			}
			if(this.status === 'rejected') {
				try {
					const rejectedFromLastPromise = onRejected(this.value)
						if(rejectedFromLastPromise instanceof FakePromise) {
							rejectedFromLastPromise.then(resolve, reject)	
						} else {
							reject(rejectedFromLastPromise)
						}
				} catch (err) {
					reject(err)
				}
			}
		})
	}
	static resolve(value) {
		if(value instanceof FakePromise) {
			return value
		}
		return new FakePromise((_resolve) => {
			_resolve(value)
		})
	}
	static reject(reason) {
		return new FakePromise((_, _reject) => _reject(reason))
	}
	static all(promises) {
		let result = []
		let count = 0
		return new FakePromise((resolve, reject) => {
			for(let i = 0; i < promises.length; i++) {
				FakePromise.resolve(promises[i]).then(res => {
					result[i] = res
					count += 1
					if(count === promises.length) {
						resolve(result)
					}
				}, err => {
					reject(err)
				})
			}
			resolve([])
		})
	}
	static race(promises) {
		return new FakePromise((_resolve, _reject) => {
			for(let p of promises) {
				FakePromise.resolve(p).then(res => _resolve(res), err => _reject(err))
			}
		}) 
	}
}