import axios from 'axios'
import { API_BASE } from './base'

// Some pages read the token from localStorage, where it never is, and send "null"
const missing = (value) => value == null || ['', 'null', 'undefined'].includes(String(value))

const apiRoot = () => new URL(API_BASE, window.location.origin).href

const isApiUrl = (url) => {
  try {
    return new URL(String(url), window.location.origin).href.startsWith(apiRoot())
  } catch {
    return false
  }
}

// Sends the signed-in user's access token with every backend request that doesn't set the
// x-access-token header itself (or sets it to nothing). The server rejects API requests
// without one (DEPLOY_IIS.md).
export function installApiAuth(store) {
  const currentToken = () => store.getState().user?.accessToken

  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = input instanceof Request ? input.url : input
    const token = currentToken()
    if (token && isApiUrl(url)) {
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}))
      if (missing(headers.get('x-access-token'))) {
        headers.set('x-access-token', token)
        init = { ...init, headers }
      }
    }
    return originalFetch(input, init)
  }

  axios.interceptors.request.use((config) => {
    const token = currentToken()
    const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url
    if (token && isApiUrl(url) && missing(config.headers.get('x-access-token'))) {
      config.headers.set('x-access-token', token)
    }
    return config
  })
}
