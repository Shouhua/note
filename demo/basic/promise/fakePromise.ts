export enum Status {
	Pending,
	Fulfilled,
	Rejected
}
export type Resolve = (value: any) => void
export type Reject = (value: any) => void
export type ThenCallbakc = (value: any) => void | FakePromise
export type Handler = (resolve: Resolve, reject?: Reject) => void

export class FakePromise {
	status = Status.Pending
	value = null
	onFulfilledCallbacks = []
	onRejectedCallbacks = []

	constructor(handler: Handler) {
		const resolve = (value: any) => {
			if(this.status === Status.Pending) {
				this.status = Status.Fulfilled
				this.value = value
				this.onFulfilledCallbacks.forEach(fn => fn(value))
			}
		}
		const reject = (value: any) => {
			if(this.status === Status.Pending) {
				this.status = Status.Rejected
				this.value = value
				this.onRejectedCallbacks.forEach(fn => fn(value))
			}
		}
		try {
			handler(resolve, reject)
		} catch(err) {
			reject(err)
		}
	}
	then(onFulfilled: ThenCallbakc, onRejected: ThenCallbakc) {
		return new FakePromise((_resolve, _reject) => {
			if(this.status === Status.Pending) {
				this.onFulfilledCallbacks.push(() => {
					const fulfilledFromLastPromise = onFulfilled(this.value)
					_resolve(fulfilledFromLastPromise)
				})
				this.onRejectedCallbacks.push(() => {
					const rejectedFromLastPromise = onRejected(this.value)
					_reject(rejectedFromLastPromise)
				})
			}
			if(this.status === Status.Fulfilled) {
				const fulfilledFromLastPromise = onFulfilled(this.value)
				_resolve(fulfilledFromLastPromise)
			}
			if(this.status === Status.Rejected) {
				const rejectedFromLastPromise = onRejected(this.value)
				_reject(rejectedFromLastPromise)
			}
		})
	}
}