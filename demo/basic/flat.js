function flatten (arr) {
	const result = []
	function run(raw) {
		raw.forEach(item => {
			if(!Array.isArray(item)) {
				result.push(item)
			} else {
				run(item)
			}
		});
	}
	run(arr)
	return result
}

const a = [1, ,10, [2, [3, 4]]];
console.log(flatten(a));

// 数组去重
Array.from(new Set(array))