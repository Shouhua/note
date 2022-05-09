import { FakePromise } from '../basic/promise/fakePromise.js'

describe('version1: simple promise', () => {
	test('sync promise', () => {
		let p1 = new FakePromise((resolve, reject) => {
			resolve(1)
		})
		p1.then(res => {
			expect(res).toEqual(1)
		})
	})
	test('async promise', () => {
		let p2 = new FakePromise((resolve, reject) => {
			setTimeout(() => resolve(2))
		})
		p2.then((res) => {
			expect(res).toEqual(2)
		})
	})
	test('chain then', () => {
		let p3 = new FakePromise((resolve, reject) => {
			setTimeout(() => resolve(2))
		})
		p3.then((res) => {
			return res + 1
		}).then(res => {
			expect(res).toEqual(3)
		})
	})
	test('\'then\' return promise and then three promise', () => {
		let p4 = new FakePromise((resolve, reject) => {
			setTimeout(() => resolve(2))
		})
		p4.then((res) => {
			expect(res).toEqual(2)
			return new FakePromise(resolve => {
				setTimeout(() => resolve(4))
			})
		}).then(res => {
			console.log(res)
			expect(res).toEqual(4)
		})
	})
	test('Promise.resolve', () => {
		const p = FakePromise.resolve('resolved')
		p.then((res) => {
			expect(res).toEqual('resolved')
		})
	})
	test('Promise.all', () => {
		const promise1 = FakePromise.resolve(3);
		const promise2 = 42;
		const promise3 = new FakePromise((resolve, reject) => {
				setTimeout(resolve, 100, 'foo');
		});

		const newPromise = FakePromise.all([promise1, promise2, promise3]).then((values) => {
			expect(values.sort()).toEqual([3, 42, 'foo'].sort())
		});
	})
	test('Promise.race', () => {
		const promise1 = new FakePromise((resolve, reject) => {
			setTimeout(resolve, 500, 'one');
		});
		const promise2 = new FakePromise((resolve, reject) => {
			setTimeout(resolve, 100, 'two');
		});
		FakePromise.race([promise1, promise2]).then((value) => {
			console.log(value);
		}, err => console.log(err));
	})
})