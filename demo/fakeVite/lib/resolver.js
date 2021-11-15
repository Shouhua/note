const path = require('path')

const requestToFile = function(request, root) {
	return path.join(root, request)
}

const fileToRequest = function(filePath, root) {
	return '/' + path.relative(root, filePath)
}


module.exports = {
	fileToRequest,
	requestToFile
}