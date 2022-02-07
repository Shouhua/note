const { parse } = require('acorn')
const walk = require('./ast/walk')

let astTree = parse(`import $ from 'jquery';`, {
	sourceType: 'module',
	locations: true,
	ranges: true,
	ecmaVersion: 8
})
let ident = 0
let padding = () => ' '.repeat(ident)

astTree.body.forEach(statment => {
	walk(statment, {
		enter(node) {
			if(node.type) {
				console.log(padding()+node.type);
				ident += 2
			}
		},
		leave(node) {
			if(node.type) {
				ident -= 2
				console.log(padding()+node.type)
			}
		}
	})
})