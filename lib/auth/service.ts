export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    username: string;
    role: string;
  };
  error?: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      return data?.success
        ? { success: true, user: data.user }
        : { success: false, error: data?.error || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }

  logout() {
    return fetch('/api/admin/logout', { method: 'POST' });
  }

  getToken(): string | null {
    return null;
  }

  isAuthenticated(): boolean {
    return false;
  }

  getAuthHeader() {
    return {};
  }
}

const authService = new AuthService();

export default authService;
