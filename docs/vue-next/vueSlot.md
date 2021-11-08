## vue slot
### vue slot编译和运行流程
首先slot必须存在于component的children中，这个前提可以在compiler和runtime的代码中都有前置判断。
  - compiler阶段会编译生成类型为Object的对象, package/compiler-core/src/transforms/vSlot.ts里面buildSlots处理
  - runtime时生成vnode，createVNode -> normalizeChildren -> set shapeFlag(slot_array)和patch flag(children为对象时，就应该是slots)
  - runtime时根据vnode生成component instance时，setupComponent->initSlots，会将children转化为instance.slots = {...}
  - setup运行的时候上下文context中的slots就是上述的slots对象
  - 代码中使用slot的时候，使用slot tag(也叫slotOutlet)，compiler中有专门的transform(package/compiler-core/src/transforms/transformSlotOutlet.ts)，转换后使用renderSlot的runtime helper function，可以认为使用renderSlot就是compiler的产物。**slot默认渲染是不使用优化的，因为有可能用户手动调用slot构建render，不能统一使用优化(block)，但是在renderSlot是一个private的runtime helper function，可以认为只给编译器调用，因此可以在里面增加优化(block)，添加openBlock, 详细可见renderSlot.ts** 
  - **compiler编译slots时，默认会加上withCtx的runtime helper function，保存当前的上下文(component instance)以供调用，另外使用withCtx的helper表示这个slot在编译阶段已经编译过了，3.2改版后在componentRenderContext.ts文件中的withCtx函数中```_d```。(这个里面有说，因为用户自己使用slots去写render函数，所以统一默认不使用优化block；有个情况例外，就是使用renderSlot时候表示一定是编译器结果代码在使用，所以在rendeSlot里面有强制添加开启优化block, 整个过程就是在renderSlot时，调用slot，此时slot为withCtx((args)=>fn)，会触发里面的_c和_d的判断)**
  - **slots对象中_是compiler中设置和传递出来的slotFlag(vSlots.ts->slotFlag)，而_c, _d, _n, _ns等是运行时变量(componentRenderContext.ts->withCtx)**

### updateComponent中有两种情况：
  - **parent component update**: 这种情况会生成新的component vnode，所以next(vnode) is not null，同时由于parent component更新有可能更新了传递进来的props和依赖自己组件scope的slots，所以会调用updateProps和updateSlots
  - **自身变化**，这个时候不会生成新的vnode，即next is null，这个时候只会运行instance.update，外部依赖没有变化，**slot在parent component中，如果是child component变量触发，虽然变量作用域(parent component scope or slot scope)来自于自身component，但是影响slot结构的变量还是来自于parent component的，所以自身变化的时候不需要更新slots**

### slot scope/parent scope怎么区分的
slot scope就是```v-slot:default="{slotProps}"```，从child component中传递slot props
parent scope就是在slot中使用parent component的作用域变量，在slot中都可以使用

### 更新时候slot的渲染
1. parent component update and slot use variable of parent component, 这时候child component会被加入到queue中，child component肯定会被执行
2. slot use slot scope and child update scope props
3. 同时有引用slot scope和parent slot不是都是dynamic slot，是不是dynamic slot在编译阶段决定，根据vslot.ts中的hasDynamicSlots决定，而决定是动态的有以下几个因素：**slot上含有vfor, vif, v-slot:[name]或者使用了context.identifiers(比如vfor里面的变量，上级vslot里面的slot props等)，如果只是单纯的引用了parent component的变量和slot scope变量组合是不会变成动态的**

### slot更新
```js
(function anonymous(
) {
const _Vue = Vue

return function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, Fragment: _Fragment, openBlock: _openBlock, createBlock: _createBlock } = _Vue

    const _component_item_component = _resolveComponent("item-component")

    return (_openBlock(), _createBlock(_Fragment, null, [
      _createTextVNode(" foo value outside of slot: " + _toDisplayString(foo) + " ", 1 /* TEXT */),
      _createVNode(_component_item_component, null, {
        default: _withCtx(() => [
          _createTextVNode(_toDisplayString(foo), 1 /* TEXT */)
        ]),
        _: 1
      }), // **item-component这里的patchFlag=0，shouldUpdateComponent里面判断的时候会到$stable的判断，app的optimized=true，这个情况比较好，patchFlag=0而且slot引用了parent component里面的变量，如果没有引用，用户可以添加$stable=true自证清白不更新component**
      _createVNode("button", {
        onClick: $event => (foo=!foo)
      }, "click", 8 /* PROPS */, ["onClick"])
    ], 64 /* STABLE_FRAGMENT */))
  }
}
})
```
```html
// App.vue
foo value outside of slot: {{foo}}
<item-component>{{foo}}</item-component>
<button @click="foo=!foo">click</button>
```
首先生成以上的vnode时候，vnode.Children.length = 3，item-component肯定是要加入到动态子元素的，因为如下代码：
```js
// track vnode for block tree
  if (
    isBlockTreeEnabled > 0 &&
    // avoid a block node from tracking itself
    !isBlockNode &&
    // has current parent block
    currentBlock &&
    // presence of a patch flag indicates this node needs patching on updates.
    // component nodes also should always be patched, because even if the
    // component doesn't need to update, it needs to persist the instance on to
    // the next vnode so that it can be properly unmounted later.
    // component都会触发更新，生成vnode(next),至于能不能更新，放在shouldUpdateComponent判断
    (vnode.patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
    // the EVENTS flag is only for hydration and if it is the only flag, the
    // vnode should not be considered dynamic due to handler caching.
    vnode.patchFlag !== PatchFlags.HYDRATE_EVENTS
  ) {
    currentBlock.push(vnode)
  }
```
先加入进来，更新的时候component更不更新再说，使用shouldUpdateComponent方法
当更新foo后，App update，patch fragment，来到item-component，updateComponnet->在shouldUpdateComponent方法中判断是否更新，跟slot相关的有2个值：
首先虽然App的optimized=true，但是item-component的patchFlag=0，(进入另一个分支，判断children.$stable是否为true，对于编译出来的slots，$stable肯定没有，所以还是不稳定的，应该update component)老版本逻辑是进入另外一个分支，后面更正了，判断是optimized && patchFlag >= 0, static props and slots should not force update, 尽管不会更新component，但是这个时候，由于child Component引用了parent compoennt的变量，会被记录到queue中。
另一种情况就是dynamic slots，这种情况的patchFlag肯定大于零，所有应该update component
总之shouldUpdateComponent其实就是判断compoennt的**props**和**children**情况

## [slot scope id变化](https://github.com/vuejs/vue-next/pull/3374)
主要是在runtime里面判断slot scope id变成了在编译阶段生成vnode的slotScopeId