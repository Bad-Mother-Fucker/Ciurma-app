import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { useDeepLink } from './lib/useDeepLink';
import { Attivita } from './pages/Attivita';
import { Dispensa } from './pages/Dispensa';
import { Impostazioni } from './pages/Impostazioni';
import { InvitoAccetta } from './pages/InvitoAccetta';
import { Login } from './pages/Login';
import { Oggi } from './pages/Oggi';
import { Onboarding } from './pages/Onboarding';
import { Spesa } from './pages/Spesa';

const queryClient = new QueryClient();

function Percorsi() {
  const { session, caricamentoSessione, membro, caricamentoMembro } = useAuth();
  useDeepLink();

  if (caricamentoSessione) return null;

  return (
    <Routes>
      <Route path="/invito/:token" element={<InvitoAccetta />} />
      {!session ? (
        <Route path="*" element={<Login />} />
      ) : caricamentoMembro ? (
        <Route path="*" element={null} />
      ) : !membro ? (
        <Route path="*" element={<Onboarding />} />
      ) : (
        <Route element={<Layout />}>
          <Route path="/oggi" element={<Oggi />} />
          <Route path="/attivita" element={<Attivita />} />
          <Route path="/dispensa" element={<Dispensa />} />
          <Route path="/spesa" element={<Spesa />} />
          <Route path="/impostazioni" element={<Impostazioni />} />
          <Route path="*" element={<Navigate to="/oggi" replace />} />
        </Route>
      )}
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Percorsi />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
