import { createContext } from 'react'

const RouterContext = createContext(null);

export const { RouterContext.Provider as RouterProvider } = RouterContext;
export RouterContext;

function useRouter() {
	return useContext(RouterContext);
}

function Link({ to, children }) {
	return <a href={to}>{children}</a>;
}

function Outlet() {

}