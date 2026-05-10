export interface AuthProvider {
  login(username: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
}

// DB2 認證提供程序
export const db2AuthProvider: AuthProvider = {
  login: async (username, password) => {
    try {
      // 調用後端 API 進行 DB2 驗證
      const response = await fetch('/api/auth/db2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          sessionStorage.setItem('admin_auth', 'true');
          sessionStorage.setItem('auth_user', username);
          sessionStorage.setItem('auth_token', data.token || '');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('DB2 驗證錯誤:', error);
      return false;
    }
  },
  logout: async () => {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
  },
  isAuthenticated: () => {
    return sessionStorage.getItem('admin_auth') === 'true';
  }
};

// 環境變數認證提供程序
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

// 選擇認證提供程序 (根據環境變數或默認使用環境變數)
// VITE_AUTH_TYPE 在構建時由 Dockerfile ARG 注入
const authType = import.meta.env.VITE_AUTH_TYPE || 'env';
console.log('Auth type configured:', authType);
export const authProvider = authType === 'db2' ? db2AuthProvider : envAuthProvider;
