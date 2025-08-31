
import { generatePath } from "react-router-dom";

export const PATHS = {
  landing: "/",
  app: "/app",
  dashboard: "dashboard",
  guest: "guest",
  login: "/login",
  signup: "/signup",
  project: "projects/:id",
  viewer: "projects/:projectId/scenes/:sceneId/viewer",
  preview: "preview/:token",
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
  viewer: (projectId: string, sceneId: string) =>
    `${PATHS.app}/${generatePath(PATHS.viewer, { 
      projectId: encodeURIComponent(projectId), 
      sceneId: encodeURIComponent(sceneId) 
    })}`,
  preview: (token: string) =>
    `${PATHS.app}/${generatePath(PATHS.preview, { token: encodeURIComponent(token) })}`,
  how: () => PATHS.how,
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteTo = ReturnType<(typeof ROUTES)[RouteKey]>;