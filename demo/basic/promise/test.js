class PromiseTest {
	constructor(asyncFn) {
		this.status = 'pending' // fulfilled, pending, rejected
		this.value = null
		this.fulfilledCallbacks = []
		this.rejectedCallbacks = []
		this.resolve = (value) => {
			if(this.status === 'pending') {
				this.status = 'fulfilled'		
				this.value = value
				this.fulfilledCallbacks.forEach(fn => fn(this.value))
			}
		}
		this.reject = (reason) => {
			if(this.status === 'pending') {
				this.status = 'rejected'		
				this.value = reason
				this.rejectedCallbacks.forEach(fn => fn(this.value))
			}
		}
		try {
			asyncFn(this.resolve, this.reject)
		} catch(error) {
			reject(error)
		}
	}
	then(onFulfilled, onRejected) {
		return new MyPromise((_resolve, _reject) => {
			if(this.status === 'pending') {
				try {
				this.fulfilledCallbacks.push(() => {
					const result = onFulfilled(this.value)
					if(result instanceof PromiseTest)
						result.then(_resolve, _reject)
					else
						_resolve(result)
				})
				} catch(error) _reject(error)
				// rejected callbacks
			}
		})
		if(this.status === 'fulfilled') {
			cosnt result = onFulfilled(this.value)
			// ...
		}
	}
	catch(onRejected) {
		this.then(null, onRejected)
	}
}

const p = new Promise((resolve, reject) => {
	setTimeout(() => {
		resolve("hello, world")
	}, 0)
})

p.then(res => {
	console.log(`1: ${res}`)
})
.catch(err => 
	console.error(err)
)