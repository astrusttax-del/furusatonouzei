import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout, mode } = useAuth();
  const isAnon = mode === 'anonymous';

  return (
    <>
      <header className="app-header">
        <span className="brand">ふるさと納税シミュレーション</span>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            試算
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
            履歴
          </NavLink>
        </nav>
        <span className="spacer" />
        {isAnon ? (
          <span className="dev-badge">開発モード（ログイン無効）</span>
        ) : (
          <>
            <span className="user">{user?.email}</span>
            <button className="btn btn-secondary" onClick={() => logout()}>
              ログアウト
            </button>
          </>
        )}
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
