class Node {
	constructor(val, left = null, right = null) {
		this.val = val
		this.left = left
		this.right = right
	}
}

function bfs(root) {
	let queue = [root]
	while(queue.length) {
		const node = queue.shift()
		console.log(node.val)
		if(node.left) {
			queue.push(node.left)
		}
		if(node.right) {
			queue.push(node.right)
		}
	}
}

let root = new Node(1, new Node(2, new Node(4), new Node(5)), new Node(3, new Node(6), new Node(7)))
bfs(root)