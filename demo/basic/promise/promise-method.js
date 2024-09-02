try {
	Promise.all([
		new Promise((resolve, reject) => {
			console.log('promise2')
			// throw new Error('just make error')
			resolve('promise2')
		}), 
		new Promise((resolve) => { console.log('promise1'); resolve(1) }),
		new Promise((resolve, reject) => { setTimeout(() => {console.log('promise3'); resolve(3)} , 100) }),
	])
		.then(res => console.log(`resolved: `, res))
		.catch(reason => console.log(`rejected: ${reason}`))
} catch (err) {
	console.log(`error: ${err}`)
}