class Node {
	constructor(val, left = null, right = null) {
		this.val = val
		this.left = left
		this.right = right
	}
}

const zigzag = (root) => {
	if (!root) return
	let leftToRight = true
	let result = []
	const queue = [root]
	while (queue.length) {
		const levelSize = queue.length
		const currentResult = new Array(levelSize)
		for (let i = 0; i < levelSize; i++) {
			const node = queue.shift()
			const index = leftToRight ? i : levelSize - 1 - i
			currentResult[index] = node.val
			if (node.left) {
				queue.push(node.left)
			}
			if (node.right) {
				queue.push(node.right)
			}
		}
		result.push(currentResult)
		leftToRight = !leftToRight
	}
	return result
}

const root = new Node(1, new Node(2, new Node(4), new Node(5)), new Node(3, new Node(6), new Node(7)))
const result = zigzag(root)
console.log(result)