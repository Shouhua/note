## vue directive and lifecycle and vnode lifecycle

built-in directive: v-model, v-once, v-if, v-for
custom directive: v-focus
lifecycle: onBeforeMounte etc
vnode lifecycle: onVnodeMounted etc

* render中的withDirectives(VNode, [...directives])会转化为dirs, 包括：
* 1. custom directives, for example, v-focus
* 2. system runtime directives, for example, <select v-model="selectedValue" />会转化成vModelSelect的命令
* onVnodeMounted等hook是放在props中的
* 可以在template explorer中调试，结果使用了withDirectives, 还有vModelSelect的helper