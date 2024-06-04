// status: pending, fulfilled, rejected
// value: promise value
const promise = new Promise((resolve, reject) => {
	// async opterate, eg, fs async, http rquest etc
	// resolve(sth) or reject(sth)
})

promise
	.then(res => {

	}, rej => {

	})
	.catch(err => {

	})
	.finally()

Promise.all([])

Promise.race([])

Promise.any([])

Promise.resolve()
Promise.reject()

// 默认属性status，value
export class FakePromise {
	constructor(handler) {
		this.status = 'pending'
		this.value = null
		this.onFulfilledCallbacks = []
		this.onRejectedCallbacks = []

		const resolve = value => {
			if(this.status === 'pending') {
				this.status === 'fulfilled'
				this.value = value
				this.onFulfilledCallbacks.forEach(fn => fn(value))
			}
		}
		const reject = value => {
			if(this.status === 'pending') {
				this.status === 'rejected'
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
			if(this.status === 'pending') {
				this.onFulfilledCallbacks.push(() => {
					try {
						const fulfilledFromLastPromise = onFulfilled(this.value);
						resolve(fulfilledFromLastPromise);
					} catch (err) {
						reject(err);
					}
				})
				this.onRejectedCallbacks.push(() => {
					try {
						const rejectedFromLastPromise = onRejected(this.value);
						reject(rejectedFromLastPromise);
					} catch (err) {
						reject(err);
					}
				})
			}
			if (this.status === "fulfilled") {
				try {
					const fulfilledFromLastPromise = onFulfilled(this.value)
					resolve(fulfilledFromLastPromise)
				} catch (err) {
					reject(err)
				}
			} else if (this.status === "rejected") {
				try {
					const rejectedFromLastPromise = onRejected(this.value)
					reject(rejectedFromLastPromise)
				} catch (err) {
					reject(err)
				}
			}
		})
	}
	reject(onRejected) {
		onRejected(this.value)
	}
}
