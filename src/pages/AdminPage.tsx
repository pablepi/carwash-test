import React, { useState } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { GlassButton } from '@/components/common/GlassButton';
import { Badge } from '@/components/common/Badge';
import { ShieldCheck, Lock, User, Warning } from '@phosphor-icons/react';
import { verifyAdminCredentials } from '@/lib/admin-auth';
import { useSiteConfig } from '@/context/SiteConfigContext';

export const AdminPage: React.FC = () => {
  const { config } = useSiteConfig();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('apex_admin_logged_in') === 'true';
  });
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const isValid = verifyAdminCredentials(login, password, (config as any).adminAuth);
    if (isValid) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('apex_admin_logged_in', 'true');
      }
      setIsAuthenticated(true);
    } else {
      setErrorMsg('Неверный логин или пароль. Проверьте введенные данные.');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apex_admin_logged_in');
    }
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div className="astryx-card w-full max-w-md p-7 sm:p-8 bg-[#161618] border border-white/10 shadow-2xl rounded-3xl">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-blue-subtle border border-accent-blue/30 text-accent-blue">
              <ShieldCheck size={28} weight="fill" />
            </div>
            <Badge variant="blue">ВХОД ДЛЯ АДМИНИСТРАТОРА</Badge>
            <h1 className="text-2xl font-extrabold text-[#F5F5F7] tracking-tight mt-2">
              Панель управления
            </h1>
            <p className="text-xs text-[#86868B] mt-1">
              Управление заказами, боксами и прайс-листом
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <Warning size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#F5F5F7] mb-1.5 uppercase tracking-wider font-semibold">
                Логин
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm font-mono text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue"
                />
                <User size={18} className="absolute left-3.5 top-3 text-[#86868B]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#F5F5F7] mb-1.5 uppercase tracking-wider font-semibold">
                Пароль
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm font-mono text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue"
                />
                <Lock size={18} className="absolute left-3.5 top-3 text-[#86868B]" />
              </div>
            </div>

            <div className="pt-2">
              <GlassButton type="submit" variant="primary" fullWidth size="md" className="font-bold">
                Войти в панель
              </GlassButton>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
            <span className="text-[11px] text-[#6E6E73]">
              Данные для входа: <code className="text-[#A1A1A6]">admin</code> / <code className="text-[#A1A1A6]">admin123</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
};
