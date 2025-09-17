// rootReducer.js
// import { combineReducers } from '@reduxjs/toolkit';
// import authReducer from './authSlice';

// const initialState = {
//   sidebarShow: true,
//   theme: 'light',
// };

// const uiReducer = (state = initialState, { type, ...rest }) => {
//   switch (type) {
//     case 'set':
//       return { ...state, ...rest };
//     default:
//       return state;
//   }
// };

// const rootReducer = combineReducers({
//   auth: authReducer,
//   ui: uiReducer,
// });

// export default rootReducer;