import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import Layout from './layout'
// import DashboardPage from '@/pages/DashboardPage'
// import ProjectPage from '../Apps/web/src/pages/ProjectPage'
// import PreviewPage from '@/pages/PreviewPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage/> },
  { path: '/app', element: <Layout/>, children: [
    //   { path: 'dashboard', element: <DashboardPage/> },
    //   { path: 'projects/:id', element: <ProjectPage/> },
    //   { path: 'preview/:token', element: <PreviewPage/> },
  ]},
])
export default function AppRouter(){ return <RouterProvider router={router}/> }
