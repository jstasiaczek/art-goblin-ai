import axios from 'axios';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UserInfo = { id: number; email?: string; username?: string; role?: string } | null;
type AuthContextValue = {
    isAuthenticated: boolean;
    ready: boolean;
    user: UserInfo;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    needsSetup: boolean;
    completeSetup: (email: string, password: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
    isAuthenticated: false,
    ready: false,
    user: null,
    login: async () => {},
    logout: () => {},
    needsSetup: false,
    completeSetup: async () => {},
});

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserInfo>(null);
    const [ready, setReady] = useState(false);
    const [needsSetup, setNeedsSetup] = useState(false);
    const initRef = useRef(false);

    // Ensure cookies are sent with requests (in case of different origin)
    useEffect(() => {
        axios.defaults.withCredentials = true;
    }, []);

    // On mount, probe session via /api/me
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        (async () => {
            try {
                const res = await axios.get<{ id: number; email?: string; username?: string; role?: string }>('/api/me');
                setIsAuthenticated(Boolean(res.data?.id));
                setUser(res.data as any);
            } catch {
                setIsAuthenticated(false);
                setUser(null);
                try {
                    const status = await axios.get<{ needsSetup?: boolean }>('/api/setup/status');
                    setNeedsSetup(Boolean(status.data?.needsSetup));
                } catch {
                    setNeedsSetup(false);
                }
            } finally {
                setReady(true);
            }
        })();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        await axios.post('/api/login', { email, password }, { headers: { 'Content-Type': 'application/json' } });
        // After successful login, verify session
        const res = await axios.get<{ id: number; email?: string; username?: string; role?: string }>('/api/me');
        setIsAuthenticated(Boolean(res.data?.id));
        setUser(res.data as any);
        setNeedsSetup(false);
    }, []);

    const logout = useCallback(async () => {
        try {
            await axios.post('/api/logout');
        } finally {
            setIsAuthenticated(false);
            setUser(null);
        }
    }, []);

    const completeSetup = useCallback(async (email: string, password: string) => {
        try {
            await axios.post('/api/setup/admin', { email, password }, { headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setNeedsSetup(false);
            }
            throw err;
        }
        const res = await axios.get<{ id: number; email?: string; username?: string; role?: string }>('/api/me');
        setIsAuthenticated(Boolean(res.data?.id));
        setUser(res.data as any);
        setNeedsSetup(false);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ isAuthenticated, ready, user, login, logout, needsSetup, completeSetup }),
        [isAuthenticated, ready, user, login, logout, needsSetup, completeSetup],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
