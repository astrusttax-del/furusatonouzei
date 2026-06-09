import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import SimulatorPage from './pages/SimulatorPage';
import HistoryPage from './pages/HistoryPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, mode } = useAuth();
  // 開発モード（匿名）: ログイン画面を挟まず常にアプリを表示する。
  // 匿名サインインの成否に関わらず試算画面は利用可能。
  if (mode === 'anonymous') return <>{children}</>;
  if (loading) return <div className="loading-screen">読み込み中…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading, mode } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          mode === 'anonymous' ? (
            <Navigate to="/" replace />
          ) : loading ? (
            <div className="loading-screen">読み込み中…</div>
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<SimulatorPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
