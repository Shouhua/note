const htmlProxyRE = /\?html-proxy&index=(\d+)\.js$/
const isHTMLProxy = (id) => htmlProxyRE.test(id)

module.exports = {
	isHTMLProxy
}