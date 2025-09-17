import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: {
    role: null,
    accessToken: null,
    refreshToken: null,
  },
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = { role: null, accessToken: null, refreshToken: null };
      state.isAuthenticated = false;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;