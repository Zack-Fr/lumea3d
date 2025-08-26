import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LandingPage from '../pages/LandingPage.tsx'
// import DashboardPage from '../pages/DashboardPage'
// import ProjectPage from '../pages/ProjectPage'
import Layout from './layout.tsx'
import AuthPage from '../pages/AuthPage'

const routes = createBrowserRouter([
  { path: '/', element: <LandingPage/> },
  //Auth pages
  { path: '/login', element: <AuthPage initialMode="signin" /> },
  { path: '/signup', element: <AuthPage initialMode="signup" /> },
  { path: '/app', element: <Layout/>, children: [
    // { path: 'dashboard', element: <DashboardPage/> },
    // { path: 'projects/:id', element: <ProjectPage/> },
  ]},
])

export default function AppRouter(){
  return <RouterProvider router={routes}/> }
