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
    favoriteModelIds: Set<string>;
    refresh: () => Promise<void>;
    toggleFavorite: (modelId: string) => Promise<void>;
};

const ModelsContext = createContext<ModelsContextValue>({
    models: [],
    loading: false,
    error: null,
    favoriteModelIds: new Set(),
    refresh: async () => {},
    toggleFavorite: async () => {},
});

export const ModelsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [favoriteModelIds, setFavoriteModelIds] = useState<Set<string>>(new Set());

    const fetchModels = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [modelsRes, favoritesRes] = await Promise.all([
                axios.get<ModelInfo[]>('/api/models'),
                axios.get<string[]>('/api/models/favorites').catch(() => ({ data: [] })),
            ]);
            setModels(modelsRes.data || []);
            setFavoriteModelIds(new Set(favoritesRes.data || []));
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to load models');
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleFavorite = useCallback(async (modelId: string) => {
        const isFavorite = favoriteModelIds.has(modelId);
        const newFavorite = !isFavorite;

        // Optimistic update
        setFavoriteModelIds((prev) => {
            const next = new Set(prev);
            if (newFavorite) {
                next.add(modelId);
            } else {
                next.delete(modelId);
            }
            return next;
        });

        try {
            await axios.patch(`/api/models/${encodeURIComponent(modelId)}/favorite`, { favorite: newFavorite });
        } catch {
            // Revert on error
            setFavoriteModelIds((prev) => {
                const next = new Set(prev);
                if (isFavorite) {
                    next.add(modelId);
                } else {
                    next.delete(modelId);
                }
                return next;
            });
        }
    }, [favoriteModelIds]);

    useEffect(() => {
        void fetchModels();
    }, [fetchModels]);

    const value = useMemo<ModelsContextValue>(
        () => ({ models, loading, error, favoriteModelIds, refresh: fetchModels, toggleFavorite }),
        [models, loading, error, favoriteModelIds, fetchModels, toggleFavorite]
    );

    return (
        <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
    );
};

export const useModels = () => useContext(ModelsContext);
