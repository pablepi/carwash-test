import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SiteConfigProvider, useSiteConfig } from './context/SiteConfigContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ClientHome } from './pages/ClientHome';
import { MyBooking } from './pages/MyBooking';
import { AdminPage } from './pages/AdminPage';
import { slugify } from './lib/slugify';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes: React.FC = () => {
  const { config } = useSiteConfig();
  const currentSlug = slugify(config.branding.name || 'carwash');

  return (
    <Routes>
      {/* Root redirects to the car wash slug derived from Admin settings */}
      <Route path="/" element={<Navigate to={`/s/${currentSlug}`} replace />} />

      {/* Direct admin shortcut */}
      <Route path="/admin" element={<Navigate to={`/s/${currentSlug}/admin`} replace />} />

      {/* Tenant Public Client & PWA Flow */}
      <Route path="/s/:tenantSlug" element={<ClientHome />} />
      <Route path="/s/:tenantSlug/my-booking" element={<MyBooking />} />

      {/* Tenant Owner / Manager Admin Panel */}
      <Route path="/s/:tenantSlug/admin" element={<AdminPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={`/s/${currentSlug}`} replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SiteConfigProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AppRoutes />
          </BrowserRouter>
        </SiteConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
