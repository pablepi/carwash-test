const CREDENTIALS_KEY = 'aquadrive_admin_credentials_override';

export interface AdminCredentials {
  login: string;
  password: string;
  isCustom: boolean;
}

export const getAdminCredentials = (): AdminCredentials => {
  const envLogin = import.meta.env.VITE_ADMIN_LOGIN || 'admin';
  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

  if (typeof window === 'undefined') {
    return { login: envLogin, password: envPassword, isCustom: false };
  }

  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.login && parsed.password) {
        return { login: parsed.login, password: parsed.password, isCustom: true };
      }
    }
  } catch (e) {
    // fallback
  }

  return { login: envLogin, password: envPassword, isCustom: false };
};

export const saveAdminCredentials = (login: string, password: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({ login: login.trim(), password: password.trim() })
    );
  } catch (e) {
    console.error('Failed to save admin credentials:', e);
  }
};

export const resetAdminCredentialsToEnv = (): AdminCredentials => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CREDENTIALS_KEY);
    } catch (e) {}
  }
  return getAdminCredentials();
};

export const verifyAdminCredentials = (inputLogin: string, inputPassword: string): boolean => {
  const current = getAdminCredentials();
  return (
    inputLogin.trim().toLowerCase() === current.login.trim().toLowerCase() &&
    inputPassword.trim() === current.password.trim()
  );
};
