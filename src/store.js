import { legacy_createStore as createStore } from 'redux'
import { persistStore, persistReducer } from 'redux-persist'
import storageSession from 'redux-persist/lib/storage/session' 

const initialState = {
  siteManagerID: null,
  aggrementDetailId: null,
  sidebarShow: true,
  theme: 'light',
  isVote: false,
  user: {
    role: null,
    accessToken: null,
    refreshToken: null
  }
}



const changeState = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    case 'setUser':
      return { ...state, user: { ...state.user, ...rest } }
    case 'clearUser':
      return { ...state, user: initialState.user }

    case 'light':
      return { ... state, theme: 'light' }

    case 'dark':
      return {... state, theme: 'dark',}

    case 'setAggrement':
      return { ...state, aggrementDetailId: rest.aggrementDetailId }

    case 'clearggrement':
        return { ...state , aggrementDetailId: initialState.aggrementDetailId }

    case 'setSiteManagerID':
        return { ...state, siteManagerID: rest.siteManagerID }
    
    case 'clearSiteManagerID':
        return { ...state, siteManagerID: initialState.siteManagerID}

    case 'Voted':
        return { ...state, isVote: true}
        
    default:
      return state
  }
}

const persistConfig = {
  key: 'root',
  storage: storageSession,
}

const persistedReducer = persistReducer(persistConfig, changeState)

const store = createStore(persistedReducer)
const persistor = persistStore(store)

export { store, persistor }















// import { legacy_createStore as createStore } from 'redux'
// import { persistStore, persistReducer } from 'redux-persist'
// import storageSession from 'redux-persist/lib/storage/session' // uses sessionStorage for web

// const initialState = {
//   aggrementDetailId: null;
//   sidebarShow: true,
//   theme: 'light',
//   user: {
//     role: null,
//     accessToken: null,
//     refreshToken: null
//   }
// }

// const changeState = (state = initialState, { type, ...rest }) => {
//   switch (type) {
//     case 'set':
//       return { ...state, ...rest }
//     case 'setUser':
//       return { ...state, user: { ...state.user, ...rest } }
//     case 'clearUser':
//       return { ...state, user: initialState.user }

//     case 'light':
//       return { ... state, theme: 'light' }

//     case 'dark':
//       return {... state, theme: 'dark',}

//     case 'setAggrement':
//       return { ...state , aggrementDetailId:  }

//     case 'clearggrement':
//         return { ...state , aggrementDetailId:  }
//     default:
//       return state
//   }
// }

// const persistConfig = {
//   key: 'root',
//   storage: storageSession,
// }

// const persistedReducer = persistReducer(persistConfig, changeState)

// const store = createStore(persistedReducer)
// const persistor = persistStore(store)

// export { store, persistor }

















// import { legacy_createStore as createStore } from 'redux'

// const initialState = {
//   sidebarShow: true,
//   theme: 'light',
// }

// const changeState = (state = initialState, { type, ...rest }) => {
//   switch (type) {
//     case 'set':
//       return { ...state, ...rest }
//     default:
//       return state
//   }
// }

// const store = createStore(changeState)
// export default store







// import { legacy_createStore as createStore } from 'redux'
// import { persistStore, persistReducer } from 'redux-persist'
// import storage from 'redux-persist/lib/storage' // defaults to localStorage for web

// const initialState = {
//   sidebarShow: true,
//   theme: 'light',
//   user: {
//     role: null,
//     accessToken: null,
//     refreshToken: null
//   }
// }

// const changeState = (state = initialState, { type, ...rest }) => {
//   switch (type) {
//     case 'set':
//       return { ...state, ...rest }
//     case 'setUser':
//       return { ...state, user: { ...state.user, ...rest } }
//     case 'clearUser':
//       return { ...state, user: initialState.user }
//     default:
//       return state
//   }
// }

// const persistConfig = {
//   key: 'root',
//   storage,
// }

// const persistedReducer = persistReducer(persistConfig, changeState)

// const store = createStore(persistedReducer)
// const persistor = persistStore(store)

// export { store, persistor }






























// import { legacy_createStore as createStore } from 'redux'

// const initialState = {
//   sidebarShow: true,
//   theme: 'light',
//   user: {
//     role: null,
//     accessToken: null,
//     refreshToken: null
//   }
// }

// const changeState = (state = initialState, { type, ...rest }) => {
//   switch (type) {
//     case 'set':
//       return { ...state, ...rest }
//     case 'setUser':
//       return { ...state, user: { ...state.user, ...rest } }
//     case 'clearUser':
//       return { ...state, user: initialState.user }
//     default:
//       return state
//   }
// }

// const store = createStore(changeState)
// export default store

