export interface AuthProvider {
  login(username: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
}

export const envAuthProvider: AuthProvider = {
  login: async (username, password) => {
    // Load from Vite env variables
    const validUser = import.meta.env.VITE_ADMIN_USER || 'admin';
    const validPass = import.meta.env.VITE_ADMIN_PASS || 'admin123';
    
    if (username === validUser && password === validPass) {
      sessionStorage.setItem('admin_auth', 'true');
      return true;
    }
    return false;
  },
  logout: async () => {
    sessionStorage.removeItem('admin_auth');
  },
  isAuthenticated: () => {
    return sessionStorage.getItem('admin_auth') === 'true';
  }
};
