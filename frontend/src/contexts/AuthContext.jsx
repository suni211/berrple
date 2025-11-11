import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({
      user,
      token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  updateUser: (userData) => set((state) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return { user: updatedUser };
  }),

  // Initialize from localStorage
  init: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Ensure both camelCase and snake_case formats exist for compatibility
        if (user.isAdmin !== undefined && user.is_admin === undefined) {
          user.is_admin = user.isAdmin;
        }
        if (user.is_admin !== undefined && user.isAdmin === undefined) {
          user.isAdmin = user.is_admin;
        }
        if (user.isVerified !== undefined && user.is_verified === undefined) {
          user.is_verified = user.isVerified;
        }
        if (user.is_verified !== undefined && user.isVerified === undefined) {
          user.isVerified = user.is_verified;
        }
        set({
          user,
          token,
          isAuthenticated: true,
        });
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  },
}));

// Initialize on load
if (typeof window !== 'undefined') {
  useAuthStore.getState().init();
}

export default useAuthStore;
