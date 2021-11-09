## vue directive and lifecycle and vnode lifecycle

**directive只是让使用者有机会操作底层DOM元素**

built-in directive: v-model, v-once, v-if, v-for
custom directive: v-focus
lifecycle: onBeforeMount etc
vnode lifecycle: onVnodeMounted etc

### render中的withDirectives(VNode, [...directives])会转化为dirs, 包括：
* 1. custom directives, for example, v-focus ---> patchFlag.NEED_PATCH
* 2. system runtime directives, for example, ```<select v-model="selectedValue" />```会转化成vModelSelect的命令 ---> patchFlag.PROPS
withDirectives会将dirs注册到VNode的dirs中，待到渲染的合适时机调用invokeDirectiveHook(vnode, prevVNode, instance, 'created')   
directives将元素各个阶段的操作形成对象，只不过内置了一些，比如select元素的v-model，vModelSelect等，详情见runtime-dom中的实现
### onVnodeMounted等vnode hook是放在props中的, 在render合适的时机调用invokeVNodeHook(hook)
* 可以在template explorer中调试，结果使用了withDirectives, 还有vModelSelect的helper ---> patchFlag.NEED_PATCH
### lifecycle
首先需要明确的是life cycle是component的life cycle，组件的，是框架使用者在setup是定义的life cycle hooks，主要是在组件渲染的时候运行(instance.update)

## NOTICE
1. 就想最前面所说的，directive是要操作DOM，因此，一般在渲染element的时候运行，包括unmount element的时候也是先判断shapeFlag是不是element再执行unmount的directive hook；vnode hooks在component和element都有运行的时机；life cycle是在component渲染时候运行
2. 用户写的不管是directive、vnode还是说life cycle的这些函数，内部叫法就是**hook**，比如vnode **hook** ```<div @vnode-mounted="handleMounted"/><div onVnodeMounted="handleMounted"/>```, directive hook, life cycle hooks