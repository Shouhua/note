function debounce(fn, delay) {
	let timer
	return function (...args) {
		if (timer)
			clearTimeout(timer)

		timer = setTimeout(() => {
			fn(...args)
			clearTimeout(timer)
		}, delay)
	}
}

function throttle(fn, delay, interval) {
	let timer
	let now = Date.now()
	return (..args) => {
		if(Date.now() - now >= interval) {
			timer && clearTimeout(timer)
			fn(...args)
			now = Date.now()
		}
		if(timer)
			clearTimeout(timer)
		timer = setTimeout(() => {
			fn(...args)
			clearTimeout(timer)
		}, delay)
	}
}

debounce(clickHandler, 3000)
throttle(clickHandler, 3000, 5000)