import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ModelSize = {
    width: number;
    height: number;
    price: string;
    maxImages: string;
};

export type ModelInfo = {
    name: string;
    id: string;
    sizes: ModelSize[];
};

type ModelsContextValue = {
    models: ModelInfo[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

const ModelsContext = createContext<ModelsContextValue>({
    models: [],
    loading: false,
    error: null,
    refresh: async () => {}
});

export const ModelsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get<ModelInfo[]>('/api/models');
            setModels(res.data || []);
        } catch {
            setError('Failed to load models');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchModels();
    }, [fetchModels]);

    const value = useMemo<ModelsContextValue>(() => ({ models, loading, error, refresh: fetchModels }), [models, loading, error, fetchModels]);

    return (
        <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
    );
};

export const useModels = () => useContext(ModelsContext);
