import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Alert, Spin } from 'antd';

import {
  postApiV1AuthAnonymous,
  postApiV1AuthRenew,
} from '@/shared/api/generated/auth/auth';
import { getApiV1UserCurrent } from '@/shared/api/generated/user/user';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/shared/api/http/auth-token';

type AuthUser = {
  userId: string;
  sessionIds: string[];
};

type AuthContextValue = {
  user: AuthUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didBootstrapRef = useRef(false);

  useEffect(() => {
    if (didBootstrapRef.current) {
      return;
    }

    didBootstrapRef.current = true;

    void bootstrapAuth()
      .then(setUser)
      .catch(() => {
        setError('Не удалось инициализировать пользователя.');
      });
  }, []);

  const value = useMemo<AuthContextValue | null>(() => {
    if (!user) {
      return null;
    }

    return { user };
  }, [user]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  if (!value) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

async function bootstrapAuth(): Promise<AuthUser> {
  const existingToken = getAccessToken();

  if (existingToken) {
    try {
      const renewed = await postApiV1AuthRenew();

      if (!renewed.accessToken) {
        throw new Error('Renew response does not contain accessToken.');
      }

      setAccessToken(renewed.accessToken);

      const currentUser = await getApiV1UserCurrent();

      if (!currentUser.userId) {
        throw new Error('Current user response does not contain userId.');
      }

      return {
        userId: currentUser.userId,
        sessionIds: currentUser.sessionIds ?? [],
      };
    } catch {
      clearAccessToken();
    }
  }

  const anonymous = await postApiV1AuthAnonymous();

  if (!anonymous.accessToken || !anonymous.user?.id) {
    throw new Error('Anonymous auth response is invalid.');
  }

  setAccessToken(anonymous.accessToken);

  return {
    userId: anonymous.user.id,
    sessionIds: [],
  };
}