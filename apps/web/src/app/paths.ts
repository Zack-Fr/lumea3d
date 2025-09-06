
import { generatePath } from "react-router-dom";

export const PATHS = {
  landing: "/",
  app: "/app",
  // user
  guest: "guest",
  login: "/login",
  signup: "/signup",
  // projects
  dashboard: "dashboard",
  project: "projects/:id",
  projectNew: "projects/new",
  projectSceneEditor: "projects/:projectId/scenes/:sceneId/editor",
  preview: "preview/:token",
  // viewer  
  viewer: "viewer/:sceneId",
  // marketing
  how: "/#how",
} as const;

export const ROUTES = {
  landing: () => PATHS.landing,
  dashboard: () => `${PATHS.app}/${PATHS.dashboard}`,
  guest: () => `${PATHS.app}/${PATHS.guest}`,
  login: () => PATHS.login,
  signup: () => PATHS.signup,

  project: (id: string) =>
    `${PATHS.app}/${generatePath(PATHS.project, { id: encodeURIComponent(id) })}`,

  projectNew: (id: string) =>
    `${PATHS.app}/${generatePath(PATHS.projectNew, { id: encodeURIComponent(id) })}`,

  projectSceneEditor: (projectId: string, sceneId: string) =>
    `${PATHS.app}/${generatePath(PATHS.projectSceneEditor, { 
      projectId: encodeURIComponent(projectId), 
      sceneId: encodeURIComponent(sceneId) 
    })}`,

  preview: (token: string) =>
    `${PATHS.app}/${generatePath(PATHS.preview, { token: encodeURIComponent(token) })}`,

  viewer: (sceneId: string) =>
    `${PATHS.app}/${generatePath(PATHS.viewer, { sceneId: encodeURIComponent(sceneId) })}`,

  how: () => PATHS.how,
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteTo = ReturnType<(typeof ROUTES)[RouteKey]>;