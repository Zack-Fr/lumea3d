
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { PATHS } from "@/app/paths";            
import { RequireAuth, GuestOnly } from "@/components/ProtectedRoute";
import Layout from "@/app/layout";
import AuthPage from "@/pages/auth/AuthPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ProjectEditor from "@/pages/projectEditor/ProjectEditorPage";
import ViewerPage from "@/pages/viewer/ViewerPage";
import LandingPage from "@/pages/landing/LandingPage";
// import PreviewPage from "@/pages/PreviewPage";

// 404(need to change)
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-8">
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 opacity-70">The page you’re looking for doesn’t exist.</p>
        <a href={PATHS.landing} className="inline-block mt-6 underline">Go home</a>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  // Public landing
  { path: PATHS.landing, element: <LandingPage/> },

  // Public viewer (for development/demos)
  { path: "/viewer/:sceneId", element: <ViewerPage /> },

  // Auth routes: visible only to guests; authenticated users are redirected away by GuestOnly
  {
    element: <GuestOnly />,
    children: [
      { path: "/login", element: <AuthPage initialMode="signin" /> },
      { path: "/signup", element: <AuthPage initialMode="signup" /> },
    ],
  },

  // Protected app area
  {
    path: PATHS.app,                        
    element: <RequireAuth />,               // gate entire app area
    children: [
      {
        element: <Layout />,                // app chrome: Topbar + Sidebar + <Outlet/>
        children: [
          { index: true, element: <Navigate to={PATHS.dashboard} replace /> },
          { path: PATHS.dashboard, element: <DashboardPage /> },               // "/app/dashboard"
          { path: PATHS.projectNew, element: <ProjectEditor /> },             // "/app/projects/new"
          { path: PATHS.project, element: <ProjectEditor /> },                // "/app/projects/:id"
          // { path: PATHS.preview, element: <PreviewPage /> },                   // "/app/preview/:token"
          { path: PATHS.viewer, element: <ViewerPage /> },                    // "/app/viewer/:sceneId"
        ],
      },
    ],
  },

  // 404 fallback
  { path: "*", element: <NotFound /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
