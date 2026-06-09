import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/config';

/**
 * 認証モード
 *  - 'password'  : メール/パスワードでログイン（本番想定）
 *  - 'anonymous' : ログイン画面なし。裏側で匿名サインインし履歴保存を可能にする（開発想定）
 * .env の VITE_AUTH_MODE で切替。未設定時は安全側の 'password'。
 */
export type AuthMode = 'password' | 'anonymous';
export const AUTH_MODE: AuthMode =
  import.meta.env.VITE_AUTH_MODE === 'anonymous' ? 'anonymous' : 'password';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  mode: AuthMode;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // 開発モード: 未ログインなら匿名サインインを試みる（履歴保存をログイン無しで使うため）。
      // 匿名認証が無効でも例外は握りつぶし、試算画面は使えるままにする。
      if (!u && AUTH_MODE === 'anonymous') {
        signInAnonymously(auth).catch((e) => {
          console.warn(
            '[Auth] 匿名サインインに失敗しました（Firebaseで匿名認証が未有効の可能性）。' +
              '試算は利用できますが履歴保存は無効です。',
            e?.code ?? e,
          );
        });
      }
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, mode: AUTH_MODE, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth は AuthProvider 内で使用してください');
  return ctx;
}
