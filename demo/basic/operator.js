// 输入一个由 Node 类型元素组成的数组，并且 Node 之间不会产生循环引用，返回一个只包含 Node value 的数组
// type Node = OperatorNode | ValueNode
// interface OperatorNode {
// 	id: string,
// 	operator: '+' | '-' | '*' | '/' // 计算操作符，
// 	refs: string[] // 引用的 node id 数组
// }
// interface ValueNode {
// 	id: string,
// 	value: number
// }
const input = [
	{
		id: 'A',
		operator: '+',
		refs: ['B', 'C', 'D']
	},
	{
		id: 'B',
		operator: '*',
		refs: ['C', 'D', 'E']
	},
	{
		id: 'C',
		value: 10
	},
	{
		id: 'D',
		operator: '-',
		refs: ['C', 'E']
	},
	{
		id: 'E',
		operator: '/',
		refs: ['C', 'F']
	},
	{
		id: 'F',
		value: 2
	}
]
// output = [265, 250, 10, 5, 5, 2]
const hasValue = (item) => 'value' in item

let cache = {}

function wrap(input, obj) {
	const id = obj['id']
	if(id in cache) {
		console.log(`cache hit key: ${id}: ${cache[id]}`)
		return cache[id]
	}
	let op = obj['operator']
	let refs = obj['refs']
	if(hasValue(obj)) 
		return obj['value']
	else { // refs
		let buffer = refs.map(ref => { // ref = 'C'
			const entity = input.filter(item => item.id === ref)
			return wrap(input, entity[0])
		})
		let result
		if(op === '+')
			result = buffer.reduce((prev, curr) => prev+curr)
		if(op === '-')
			result = buffer.reduce((prev, curr) => prev-curr)
		if(op === '*')
			result = buffer.reduce((prev, curr) => prev*curr)
		if(op === '/')
			result = buffer.reduce((prev, curr) => prev/curr)
		return (cache[id] = result)	
	}
}

function calc(input) {
	let result = []
	if(!Array.isArray(input)) return result
	input.forEach(item => { // item : {id, op.., ref}
		if(hasValue(item)) {
			result.push(item['value'])
		} else {
			result.push(wrap(input, item))
		}
	})
	console.log(result)
}

calc(input)