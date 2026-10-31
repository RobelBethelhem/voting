// Single source of truth for the backend base URL.
//
// - Local development (npm start) talks to the backend on http://localhost:5000/api.
// - The production build is served by IIS next to the backend, so it uses the relative path
//   /zbvs/api, which the browser resolves against whichever host loaded the page
//   (e.g. https://aps2.zemenbank.com/zbvs/api). See DEPLOY_IIS.md.
//
// Override with VITE_API_BASE in an env file (e.g. .env.production.local) if the backend lives
// somewhere else, e.g. VITE_API_BASE=/voting/api
export const API_BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/zbvs/api')
