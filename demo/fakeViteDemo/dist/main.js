import { b as browserDebug, r as ref, c as createElementBlock, o as openBlock, a as reactive, d as debounce, e as resolveComponent, f as createVNode, g as createBaseVNode, t as toDisplayString, n as normalizeClass, F as Fragment, h as createApp } from './vendor-9b29ca27.js';

var name = "Leborn James";
var gender = "man";
var person = {
	name: name,
	gender: gender
};


if(!document.getElementById('fakeviite-2d26a6af')) {
	let $style = document.createElement('style')
	$style.id = 'fakevite-2d26a6af'
	$style.textContent = `.green {
	color: green;
	font-size: 16px;
}
.url {
	background: url('assets/cx-3e15c4d4.jpeg');
}
._foo_110uz_1 {
	color: lightcoral;
}

.foo[data-v-72c647e6] {
	color: lightcyan
}


.red {
	color: red;
	font-size: 60px;
}


._bar_smeg2_2 {
	color:blue;
}

`
	document.getElementsByTagName('head')[0].appendChild($style)	
}
			

var foo = "_foo_110uz_1";
var styleModule = {
	foo: foo
};

const appDebug = new browserDebug('app');
const fooDebug = new browserDebug('foo');

var script$1 = {
	setup() {
		fooDebug('fooooooooooooooooooooooooo');
		return {
			name: ref('Foo')
		}
	},
};

const _hoisted_1$1 = { class: "foo" };

function render$1(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock("div", _hoisted_1$1, "name"))
}



script$1.render = render$1;
script$1.__scopeId = "data-v-72c647e6";
script$1.__file = "src/components/foo.vue";

var script = {
	components: {
		Foo: script$1
	},
	setup() {
		let count = ref(0);
		let name = ref(person.name);
		const s = reactive(styleModule);
		appDebug('apppppppppppppppppppppppppppp');
		return {
			s,
			count,
			name,
			handleClick: debounce(() => count.value += 10)
		}
	}
};

var _imports_0 = "assets/cx-3e15c4d4.jpeg";

const _hoisted_1 = /*#__PURE__*/createBaseVNode("h1", null, "helo worldddd!", -1 /* HOISTED */);
const _hoisted_2 = { class: "green" };
const _hoisted_3 = /*#__PURE__*/createBaseVNode("input", { type: "range" }, null, -1 /* HOISTED */);
const _hoisted_4 = { class: "red" };
const _hoisted_5 = /*#__PURE__*/createBaseVNode("div", { class: "url" }, "css url", -1 /* HOISTED */);
const _hoisted_6 = /*#__PURE__*/createBaseVNode("div", null, [
  /*#__PURE__*/createBaseVNode("img", {
    src: _imports_0,
    alt: ""
  })
], -1 /* HOISTED */);

function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_foo = resolveComponent("foo");

  return (openBlock(), createElementBlock(Fragment, null, [
    _hoisted_1,
    createVNode(_component_foo),
    createBaseVNode("div", _hoisted_2, toDisplayString($setup.name), 1 /* TEXT */),
    createBaseVNode("div", {
      class: normalizeClass($setup.s.foo)
    }, "module style", 2 /* CLASS */),
    createBaseVNode("div", {
      class: normalizeClass(_ctx.$style.bar)
    }, "inline module style", 2 /* CLASS */),
    _hoisted_3,
    createBaseVNode("div", _hoisted_4, toDisplayString($setup.count), 1 /* TEXT */),
    createBaseVNode("button", {
      onClick: _cache[0] || (_cache[0] = (...args) => ($setup.handleClick && $setup.handleClick(...args)))
    }, "Click"),
    _hoisted_5,
    _hoisted_6
  ], 64 /* STABLE_FRAGMENT */))
}





var style1 = {"bar":"_bar_smeg2_2"};

const cssModules = script.__cssModules = {};
cssModules["$style"] = style1;

script.render = render;
script.__file = "src/App.vue";

localStorage.setItem('debug', 'app');
createApp(script).mount('#app');
//# sourceMappingURL=main.js.map
