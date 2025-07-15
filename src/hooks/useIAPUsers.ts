import { useState, useEffect } from 'react';

interface IAPUser {
  email: string | null;
  id: string | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

export const useIAPUser = (): IAPUser => {
  const [user, setUser] = useState<IAPUser>({
    email: null,
    id: null,
    authenticated: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user');
        
        if (response.ok) {
          const userData = await response.json();
          setUser({
            email: userData.email,
            id: userData.id,
            authenticated: userData.authenticated,
            loading: false,
            error: null,
          });
        } else if (response.status === 401) {
          setUser({
            email: null,
            id: null,
            authenticated: false,
            loading: false,
            error: 'Not authenticated',
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        setUser({
          email: null,
          id: null,
          authenticated: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch user info',
        });
      }
    };

    fetchUser();
  }, []);

  return user;
};