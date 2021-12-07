const fs = require('fs')
const { cleanUrl } = require('../utils')
const path = require('path')

function checkPublicFile(
  url,
  { publicDir }
) {
  // note if the file is in /public, the resolver would have returned it
  // as-is so it's not going to be a fully resolved path.
  if (!publicDir || !url.startsWith('/')) {
    return
  }
  const publicFile = path.join(publicDir, cleanUrl(url))
  if (fs.existsSync(publicFile)) {
    return publicFile
  } else {
    return
  }
}

module.exports = {
	checkPublicFile
}