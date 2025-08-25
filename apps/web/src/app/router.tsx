import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LandingPage from '../pages/LandingPage.tsx'
// import DashboardPage from '../pages/DashboardPage'
// import ProjectPage from '../pages/ProjectPage'
import Layout from './layout.tsx'

const routes = createBrowserRouter([
  { path: '/', element: <LandingPage/> },
  { path: '/app', element: <Layout/>, children: [
    // { path: 'dashboard', element: <DashboardPage/> },
    // { path: 'projects/:id', element: <ProjectPage/> },
  ]},
])

export default function AppRouter(){
  return <RouterProvider router={routes}/> }
