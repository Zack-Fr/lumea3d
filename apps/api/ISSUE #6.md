When trying to create a new project on the dashboardPage and after I sign in I get redirected to the project editor page with an initial error attached above "error_One.png". Seconds after that the whole frontend crashes with the below errors. I can only see the first error for a couple of seconds if I refresh the page, then the frontend crashes back to the below errors.





logger.ts:20 ERROR: The above error occurred in the <StagedSceneLoader> component: at StagedSceneLoader (http://localhost:5173/src/features/scenes/StagedSceneLoader.tsx:24:3) at div at http://localhost:5173/src/components/projectEditor/ViewportCanvas.tsx:27:3 at main at div at div at ProjectEditorContent (http://localhost:5173/src/pages/projectEditor/ProjectEditorPage.tsx:69:20) at SceneProvider (http://localhost:5173/src/contexts/SceneContext.tsx:31:3) at ProjectEditorPage (http://localhost:5173/src/pages/projectEditor/ProjectEditorPage.tsx:39:34) at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4088:5) at Outlet (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4494:26) at main at div at Layout at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4088:5) at Outlet (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4494:26) at RequireAuth (http://localhost:5173/src/components/ProtectedRoute.tsx:121:42) at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4088:5) at RenderErrorBoundary (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4048:5) at DataRoutes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:5239:5) at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4501:15) at RouterProvider (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:5053:5) at AppRouter at App at AuthProvider (http://localhost:5173/src/providers/AuthProvider.tsx:34:32) at QueryClientProvider (http://localhost:5173/node_modules/.vite/deps/@tanstack_react-query.js?v=91cbcd1d:2763:3) at QueryProvider (http://localhost:5173/src/providers/QueryProvider.tsx:28:33) React will try to recreate this component tree from scratch using the error boundary you provided, RenderErrorBoundary.

logger.ts:20 ERROR: React Router caught the following error during render {} {"componentStack":"\n at StagedSceneLoader (http://localhost:5173/src/features/scenes/StagedSceneLoader.tsx:24:3)\n at div\n at http://localhost:5173/src/components/projectEditor/ViewportCanvas.tsx:27:3\n at main\n at div\n at div\n at ProjectEditorContent (http://localhost:5173/src/pages/projectEditor/ProjectEditorPage.tsx:69:20)\n at SceneProvider (http://localhost:5173/src/contexts/SceneContext.tsx:31:3)\n at ProjectEditorPage (http://localhost:5173/src/pages/projectEditor/ProjectEditorPage.tsx:39:34)\n at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4088:5)\n at Outlet (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4494:26)\n at main\n at div\n at Layout\n at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4088:5)\n at Outlet (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4494:26)\n at RequireAuth (http://localhost:5173/src/components/ProtectedRoute.tsx:121:42)\n at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4088:5)\n at RenderErrorBoundary (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4048:5)\n at DataRoutes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:5239:5)\n at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:4501:15)\n at RouterProvider (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=91cbcd1d:5053:5)\n at AppRouter\n at App\n at AuthProvider (http://localhost:5173/src/providers/AuthProvider.tsx:34:32)\n at QueryClientProvider (http://localhost:5173/node_modules/.vite/deps/@tanstack_react-query.js?v=91cbcd1d:2763:3)\n at QueryProvider (http://localhost:5173/src/providers/QueryProvider.tsx:28:33)"}

logger.ts:18 INFO: ✅ StagedManifest: shell stage completed in 1757374998704ms

logger.ts:18 INFO: 🎯 Stage "shell" completed:

logger.ts:18 INFO: 🚀 StagedManifest: Loading complete stage with categories:

logger.ts:18 INFO: ✅ StagedManifest: complete stage completed in 1757374998723ms

logger.ts:18 INFO: 🎯 Stage "complete" completed:

logger.ts:18 INFO: 🎉 StagedManifest: Complete! Total time: 1757374998723ms

logger.ts:18 INFO: 🎉 All stages completed!

logger.ts:18 INFO: ✅ StagedManifest: complete stage completed in 1757374998726ms

logger.ts:18 INFO: 🎯 Stage "complete" completed:

logger.ts:18 INFO: 🎉 StagedManifest: Complete! Total time: 1757374998726ms

logger.ts:18 INFO: 🎉 All stages completed!