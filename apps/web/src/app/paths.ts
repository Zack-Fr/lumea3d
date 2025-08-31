
import { generatePath } from "react-router-dom";

export const PATHS = {
  landing: "/",
  app: "/app",
  // user
  // user
  guest: "guest",
  login: "/login",
  signup: "/signup",
  dashboard: "dashboard",
  // projects
  dashboard: "dashboard",
  // projects
  project: "projects/:id",
  projectNew: "projects/new",
  projectNew: "projects/new",
  preview: "preview/:token",
  // marketing
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

  preview: (token: string) =>
    `${PATHS.app}/${generatePath(PATHS.preview, { token: encodeURIComponent(token) })}`,


  how: () => PATHS.how,
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteTo = ReturnType<(typeof ROUTES)[RouteKey]>;