## React手动脚手架
```bash
webpack
npm i -D webpack webpack-cli webpack-dev-server html-webpack-plugin \
	babel-loader @babel/core @babel/preset-env @babel/preset-react \
	style-loader css-loader postcss-loader sass-loader sass autoprefixer
npm i react react-dom react-router-dom react-redux @reduxjs/toolkit
```

```js
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = ({mode}) => {
	return {
		mode,
		entry: './src/index.js',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: '[name].[contenthash].js'
		},
		resolve: {
			extensions: ['.jsx', '.js', '.json']
		},
		devtool: 'eval-source-map',
		devServer: {
			port: 9000,
			hot: true,
			historyApiFallback: true
		},
		module: {
			rules: [
				{
					test: /.jsx$/,
					loader: ['bable-loader'],
					exclude: /node_modules/
				},
				{
					test: /.css$/,
					loader: ['style-loader', 'css-loader', 'postcss-loader']
				},
				{
					test: /.scss$/,
					loader: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
				},
			]
		},
		plugins: [
			new HtmlWepbackPlugin({
				template: 'index.html'
			})
		],
		optimization: {
			splitChunks: {
				cacheGroups: {
					vendor: {
						test: /node_modules/,
						name: 'vendor',
						chunks: all,
						priority: 1
					},
					react: {
						test: /node_modules/react.*/,
						name: 'vendor',
						chunks: all,
						priority: 10
					}
				},
				runtimeChunk: {
					name: 'manifest'
				}
			}
		}
	}
}

```

```js
// bable.config.json
{
	"presets": [
		["@babel/preset-env"],
		["@babel/preset-react", { runtime: "automatic"}]
	]
}
```

```js
// postcss.config.js
cosnt autoprefixer = require('autoprefixer')
module.exports = {
	plugins: [autoprofixer]
}	
```

```jsx
import {StrictMode createRoot, lazy} from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Provider as ReduxProvider } from 'react-redux'

import { configureStore, creatSlice } from '@reduxjs/toolkit'
const store = configureStore({
	reducer: {
		count: counterReducer
	}
})

const counerSlice = createSlice({
	name: 'counter',
	initialState: {
		count: 1
	},
	reducers: {
		increment: (state, action) => {
			return {
				...state,
				count: state.count + 1
			}
		}
	}
})
export const { increment } = counterSlice.actions
export default counterSlice.reducer

const app = createRoot(document.querySelector('#app'))

const App = lazy(() => './App.jsx')

const router = createBrowserRouter([
	{
		path: '/',
		element: <App />
	}
])

app.render(
	<>
	<StrictMode>
	<ReduxProvider store={store}>		
		<RouterProvider router={router}>

		</RouterProvider>
		</ReduxProvider>
		</StrictMode>
	</>
)

import { useSelector, useDispatch } from 'react-redux'
const count = useSelector(state => state.counter.count)
const dispatch = useDispatch()
dispatch(increment)
 <Link to="/">Link to HOME</Link
 <NavLink classname={(isActive)=> isActive?'active-class':'inactive-lcass'} to="/">Nav Link to HOME</NavLink>
 <Outlet />

const [count, setCount] = useState(0)
useEffect(() => {
	console.log(id)
}, [id])
useCallback(() => {
	fetch('/', {})
}, [id])
const ref = useRef(null)
const inputRef = useRef(null)
inputRef.current.foucs
<input ref={inputRef} value={count} onChange={(ev) => handleInput(ev)} />
forwareRef(function({}, ref))

const ThemeContext = createContext('system')
<ThemeContext.Provider value='dark'>
	<App />
</ThemeContext.Provider>
useContext(ThemeContext)

const initial = {
	count: 0
}

function reducer(state, action) {
	switch (action.type) {
		case 'increment':
			return {
				...state,
				count: state.count+1
			}
	}
}

const [state, dispatch] = useReducer(reducer, inital)
dispatch({payload: 'increment', payload: 1})

lazy
memo(Comp) // prop变化才重新渲染

import { PropTypes } from 'prop-types'
const Comp = (props) => {
	return (...)
}
Comp.propTypes = {
	name: PropTypes.string
}
```