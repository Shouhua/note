## Pure Componnet
### 纯组件特征(怎么定义纯组件)
1. Idempotent(幂等)
相同的输入(props, state, context) 总是能得到相同的结果输出
NOTE: 所以在rendering时候(函数里面修改ref.current和jsx中引入ref)读写ref会导致不是纯函数，因为引入了额外的依赖。(https://react.dev/reference/react/useRef)
2. has no side effects in render

3. Does not mutate non-local values(不改变外部变量)

### 纯组件有什么好处
如果没有side effect，渲染的时候可以随时停下来

useEffect里面的callback函数是等rendering完成后才执行
NOTE: **组件rendering过程**指在官方文档中包括函数的执行内容，不包括useEffect的callback，event handler等函数，所以，对于有side effect的方法可以放到这些函数中，比如new Date(), Math.random()等。(https://react.dev/reference/rules/components-and-hooks-must-be-pure) 这个文章对于这些词汇解释很清晰

### Rules of Hooks
Don't call Hooks inside loops, conditions, nested functions, or try/catch/finally block

## 基本概念
### useReducer
```js
initialState = { count: 0 }
function stateReducer(state, action) {
	switch (action.type) {
		case ‘setCount’:
			return {…state, count: action.value }
		default:
			throw new Error(‘Unknown action’)
	}
}
const [state, dispatch] = useReducer(stateReducer, initialState)
dispatch({type: ’setCount’, value: state.count+5})
```
### flushSync
```js
flushSync(() => {
	setSomething(123)
})
```

### useContext, createContext
```js
const ThemeContext = createContext(‘system’) // 在component外部定义
<Context.Provider value=“dark”>
	<Form />
</Context.Provider>
const useGetTheme = () => useContext(ThemeContext)
```

### useMemo
类似于Vuejs中的computed, 缓存数据直到依赖变化
The useMemo Hooks will create/re-access a memorized value from a function call, re-running the function only when dependencies passed as the 2nd parameter are changed. The result of calling the Hook is inferred from the return value from the function in the first parameter.
```js
useMemo(() => filterTodos(todos, tab), [todos, tab])
```

### useCallback
#### 使用场景
正常情况下，Component更新会更新所有的子组件，当从父组件传递function到子组件时，每次re-render都会生成新的function，这样即使使用了memo包裹子组件也还是会每次更新子组件。useCallback就是这种场景使用，**如果第二个参数为空，则跟不用一样；没有第二个参数，就会从不更新**

provide a stable reference to a function as long as the dependencies passed into the second parameter are the same.
`Const handleClick = useCallback(() => {}, [todos])`

```js
import { useCallback, useMemo } from 'react';

function MyApp() {
  const [currentUser, setCurrentUser] = useState(null);

  const login = useCallback((response) => {
    storeCredentials(response.credentials);
    setCurrentUser(response.user);
  }, []);

  const contextValue = useMemo(() => ({
    currentUser,
    login
  }), [currentUser, login]);

  return (
    <AuthContext.Provider value={contextValue}>
      <Page />
    </AuthContext.Provider>
  );
}
```

### useRef
https://react.dev/learn/scaling-up-with-reducer-and-context
useRef(0)会保存当前状态，但是不会触发re-render，一般保存timeout IDs，DOM elements
•	You can store information between re-renders (unlike regular variables, which reset on every render).
•	Changing it does not trigger a re-render (unlike state variables, which trigger a re-render).所以变量和UI不会联动
•	The information is local to each copy of your component (unlike the variables outside, which are shared).

### lazy, memo
lazy 和memo都需要放在模块的最上级，即放在component function外边
```js
const MarkdownPreview = lazy(() => import(‘./MarkdownPreview.js’))
```

Greeting组件如果props.name没有改变，组件不会重新渲染, 但是开发者自己保证，This means that it must return the same output if its props, state, and context haven’t changed。
```js
const Greeting = memo(function({name} {return <h1>Hello {name}</h1>})
export default Greeting
```

### createPortal
一般用在jsx中，根据条件判断后使用createPortal，比如
```jsx
isShowModal && createPortal(Component, DomNode)
```

### react18跟Vuejs区别
1. React中没有directive，directive一般用于直接操作dom，在react中可以使用ref直接操作，并且可以组件组合或者高阶组件实现，比如v-model使用useState和onChange；v-if使用原生js判断
2. 高阶组件(HOC High Order Component)
使用Component作为传参，返回一个Component
```js
import React, { useEffect } from 'react'; 
const withLogging = (WrappedComponent) => { 
	return (props) => { 
		useEffect(() => { 
			console.log('Component mounted'); 
			return () => console.log('Component unmounted'); 
		}, []); 
		return <WrappedComponent {...props} />; 
	}; 
};
const MyComponent = () => <div>My Component</div>; 
const MyComponentWithLogging = withLogging(MyComponent); 
function App() { return <MyComponentWithLogging />; } 
export default App;
```
3. 组合组件
将组件作为props.children传入，然后在在父组件中组合使用
```js
import React, { useEffect, useRef } from 'react'; 
const FocusableInput = () => { 
	const ref = useRef(null); 
	useEffect(() => { ref.current.focus(); }, []); 
	return <input ref={ref} />; 
}; 
const LoggingComponent = ({ children }) => { 
	useEffect(() => { 
		console.log('Component mounted'); 
		return () => console.log('Component unmounted'); 
	}, []); 
	return <>{children}</>; 
}; 
function App() { return ( <LoggingComponent> <FocusableInput /> </LoggingComponent> ); } 
export default App;
```
4. 为什么vuex中不需要使用immutable变量
跟vue的变化管理有关。react状态是根据用户指定的状态是否有变化，需要判断变量是否变化，使用immutable更加高效; 而vue使用Proxy方式已经自动监听了变量的变化

5. Vue slot/named slots, React props.children {children}/ render props
```js
<Card renderHeader={() => <h2>Header Content</h2>} renderBody={() => <p>Body Content</p>} renderFooter={() => <button>Footer Button</button>} /> ```

组件库
Megvii-icon（主要使用svgo库来裁剪UED给的图标sketch，figma等）
Admin page: 上传svg前端工程，
后端服务使用svgo裁剪后存入mongodb(mongoose)
vue-icons：注册megvii-icon组件，主要是使用各种props标识svg组件，这个组件使用name来指示之前注册的svg

meg-roi

埋点(自定义指令和方法) directive（在bind时候注册各种modifier事件，比如click，doubleclick，mouseenter等，unbind时候removelistener，value一般为埋点关心的事件名称，信息还包括当前模块等从store里面取），method

I18n(工程化)
词条平台
Node-xlsx 导出excel
有的文件国际化了，有的没有，使用vue-i18n，vue文件中使用this.$t(‘测试’), template中使用$t(‘测试’),其他js文件中使用
i18n.t(‘身份证’)
使用正则表达式抽取中文，并且添加i18n.t或者this.$t()
封装i18n，比如有做方向指令v-i18n-direction添加到classList中，还有i18n指令（date，number的moidifer），但是没有用起来

架构演进, 多个工程，中台化，单个工程（微服务）


Vue3 different 细节
directive现在的lifecycle跟以前不一样了，现在跟component一致，2版本使用bind，unbind，inserted等
v-if和v-for可以在一起使用

All-in-web
104 modules
113 components

水印(water-mark)
组件，div(z-index, background-repeat， pointer-event: none)，使用传入的参数(text, opacity, xcount, ycount, angle)等在canvas画布中生成png图片，canvas.toDataUrl(), 然后塞入style.backgroundImage= url

图片加载
1. 可视区域加载
IntersectionObserver(或者)？？？？？？？
2. 使用多个接口服务图片，每个接口可以加载最多6个

CI/CD
各种脚本，调研多种方式，比如shell，shelljs，python，nodejs
gitlab pipelines，前端基本有3个stage，build and push image，sync devops，release
Docker, 优化镜像，wiredtiger镜像优化，使用buildx生成多平台镜像

携图跳转(common-switch-params.js)
携带大量数据跳转, 根据传递参数大小比如1000，判断使用何种方式：
Blob url （这个有个缺陷，blog 依赖生成他的tab，如果关闭了就消失了）
	 const blog = new Blob(value, {type: ‘application/json;charset=UTF-8’})
	 const url = URL.createObjectURL(blob) (注意 revokeObjectURL)
Localstorage.setItem(‘key’, value)
普通query传值

没有引入indexedDB，复杂性不值当

设备树
	最后方案：传递所有的directory，当展开时候再去请求数据，另外可以加入可视区域渲染
其实好多都是设计上产生的复杂，比如时间输入框，一会儿要两个输入，一会一个等

Local storage 5M, 同源
Cookie 4k，同源，一般用于前后端交互 用户信息存储，可以设置到期时间，可以通过domain和path设置控制作用于，默认同源
indexedDB 无限存储，同源