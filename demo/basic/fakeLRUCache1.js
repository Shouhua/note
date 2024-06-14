class Node {
	constructor(key, value, next= null, prev=null) {
		this.key = key
		this.value = value
		this.next = next
		this.prev = prev
	}
}

/**
 *  LRU(Least Recent Used)
 */
class LRU {
	constructor(limit=4) {
		this.size = 0
		this.limit = limit
		this.head = null
		this.tail = null
		// this.cache = {}
	}
	write(key, value) {
		this.ensureLimit()
		const n = new Node(key,value)
		if(this.size === 0) {
			this.head = this.tail = n
		} else {
			n.next = this.head
			this.head.prev = n
			n.prev = null
			this.head = n
		}
		this.size++
	}
	ensureLimit() {
		if(this.size === this.limit) {
			// 删除最后一个元素
			const secondLast = this.tail.prev
			secondLast.next = null
			this.tail = secondLast
			this.size--
		}
	}
	read(key) {
		let n = this.head
		let val = null
		while(n) {
			if(n.key === key) {
				val = n.value
				const prevNode = n.prev
				const nextNode = n.next
				if(prevNode) {
					prevNode.next = nextNode
				}
				if(nextNode) {
					nextNode.prev = prevNode
				} else { // 这个node是最后一个元素
					this.tail = prevNode
				}
				n.next = this.head
				n.prev = null
				this.head = n
				break
			}
			n = n.next
		}
		return val
	}
	*[Symbol.iterator]() {
		let n = this.head
		while(n) {
			yield n	
			n = n.next
		}
	}
}

const lru = new LRU(3)
lru.write(1, 'foo')
lru.write(2, 'bar')
lru.write(3, 'foobar')

let val = lru.read(1)
console.log(`key 1's value: ${val}`)

lru.write(4, 'hello')

for(let n of lru) {
	console.log(`key: ${n.key}, value: ${n.value}`)
}