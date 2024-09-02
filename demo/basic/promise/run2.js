setTimeout(() => {
	console.log('set timeout1')
	Promise.resolve().then(() => console.log('promise resolve in settimeout1'))
}, 0);
Promise.resolve().then(() => console.log('promise1 resolved'));
setTimeout(() => {
	console.log('set timeout2')
	Promise.resolve().then(() => {
		setTimeout(() => {
			console.log('settimeout 3 in promise which in settimeout2')
		}, 0);
		console.log('promise resolve in settimeout2')
	})
}, 0)
