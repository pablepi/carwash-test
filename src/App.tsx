import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SiteConfigProvider } from './context/SiteConfigContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ClientHome } from './pages/ClientHome';
import { MyBooking } from './pages/MyBooking';
import { AdminPage } from './pages/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SiteConfigProvider>
          <BrowserRouter>
            <Routes>
              {/* Default redirect to reference studio tenant */}
              <Route path="/" element={<Navigate to="/s/apex-detailing" replace />} />

              {/* Tenant Public Client & PWA Flow */}
              <Route path="/s/:tenantSlug" element={<ClientHome />} />
              <Route path="/s/:tenantSlug/my-booking" element={<MyBooking />} />

              {/* Tenant Owner / Manager Admin Panel */}
              <Route path="/s/:tenantSlug/admin" element={<AdminPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/s/apex-detailing" replace />} />
            </Routes>
          </BrowserRouter>
        </SiteConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
