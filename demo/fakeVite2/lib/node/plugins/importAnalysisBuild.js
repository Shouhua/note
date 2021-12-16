/**
 * A flag for injected helpers. This flag will be set to `false` if the output
 * target is not native es - so that injected helper logic can be conditionally
 * dropped.
 */
 const isModernFlag = `__VITE_IS_MODERN__`
 const preloadMethod = `__vitePreload`
 const preloadMarker = `__VITE_PRELOAD__`
 const preloadBaseMarker = `__VITE_PRELOAD_BASE__`
 
 const preloadHelperId = 'vite/preload-helper'
 const preloadMarkerRE = new RegExp(`"${preloadMarker}"`, 'g')

 module.exports = {
	 isModernFlag,
	 preloadMethod,
	 preloadMarker,
	 preloadBaseMarker
 }