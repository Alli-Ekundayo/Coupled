import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthModal } from './auth/AuthModal';
import { AuthProvider } from './auth/AuthProvider';
import { AppLayout } from './layout/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { StudioPage } from './pages/StudioPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function LegacyHashRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/studio') || hash === '#studio') {
      const match = hash.match(/project=([^&]+)/);
      navigate(match ? `/studio?project=${match[1]}` : '/studio', { replace: true });
    }
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LegacyHashRedirect />
        <Routes>
          <Route path="/studio" element={<StudioPage />} />
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/sign-in" element={<AuthPage />} />
            <Route path="/sign-up" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <AuthModal />
      </AuthProvider>
    </QueryClientProvider>
  );
}
