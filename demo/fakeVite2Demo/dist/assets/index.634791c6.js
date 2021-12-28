import { d as debug, f as flatMap } from './vendor.35f48e57.js';

const p = function polyfill() {
  const relList = document.createElement('link').relList;
  if (relList && relList.supports && relList.supports('modulepreload')) {
    return
  }

  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') {
        continue
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'LINK' && node.rel === 'modulepreload')
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });

  function getFetchOpts(script) {
    const fetchOpts = {};
    if (script.integrity) fetchOpts.integrity = script.integrity;
    if (script.referrerpolicy) fetchOpts.referrerPolicy = script.referrerpolicy;
    if (script.crossorigin === 'use-credentials')
      fetchOpts.credentials = 'include';
    else if (script.crossorigin === 'anonymous') fetchOpts.credentials = 'omit';
    else fetchOpts.credentials = 'same-origin';
    return fetchOpts
  }

  function processPreload(link) {
    if (link.ep)
      // ep marker = processed
      return
    link.ep = true;
    // prepopulate the load record
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
};__VITE_IS_MODERN__&&p();

var foo$2 = '';

function foo$1() {console.log('foo from virtual module');}

function foo() {
	console.log('foo000000000dsfadfasdsdasd');
}

let log = debug("app:logging");
log("testing logging");
foo$1();
foo();
console.log("helo, world!");
console.log(`flatmap: ${flatMap(["1", [2, 3]])}`);
