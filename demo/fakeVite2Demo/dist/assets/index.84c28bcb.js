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
};true&&p();

var foo$1 = '';

const scriptRel = 'moduleproload';const seen = {};const base = '/';const __vitePreload = function preload(baseModule, deps) {
  if (!true || !deps || deps.length === 0) {
    return baseModule()
  }

  return Promise.all(
    deps.map((dep) => {
      dep = `${base}${dep}`;
      if (dep in seen) return
      seen[dep] = true;
      const isCss = dep.endsWith('.css');
      const cssSelector = isCss ? '[rel="stylesheet"]' : '';
      // check if the file is already preloaded by SSR markup
      if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
        return
      }
      const link = document.createElement('link');
      link.rel = isCss ? 'stylesheet' : scriptRel;
      if (!isCss) {
        link.as = 'script';
        link.crossOrigin = '';
      }
      link.href = dep;
      document.head.appendChild(link);
      if (isCss) {
        return new Promise((res, rej) => {
          link.addEventListener('load', res);
          link.addEventListener('error', rej);
        })
      }
    })
  ).then(() => baseModule())
};

function foo() {
	console.log('foo000000000dsfadfasdsdasd');
	__vitePreload(() => Promise.resolve().then(function () { return foobar; }),true?void 0:void 0).then(m => {
		m.default();
	});
}

function __glob_0_1() {
	console.log('foobar');
}

var foobar = /*#__PURE__*/Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: 'Module',
  'default': __glob_0_1
});

const ms = { "./foo.js": foo, "./foobar.js": __glob_0_1,};
for (const p in ms) {
  ms[p]().then((mod) => {
    mod.default();
  });
}
console.log("helo, main");
