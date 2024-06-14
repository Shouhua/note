function debounce(fn, delay) {

}

let source = `<div className="container">
	<h2>The Title</h2>
	<div>content</div>
</div>`

/*
element {
	tag: string,
	attrs: {key: val},
	children: [element]
}
[element]
*/
function parse(source) {
	parseChildren(source, [])
}

function parseChildren(source) {
	while(source)
}