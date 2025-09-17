import { ConfigProvider, theme as antdTheme } from 'antd';
import { ThemeContext } from "../../state/ThemeContext";
import { ModelsProvider } from "../../state/ModelsContext";
import { AuthProvider } from "../../state/AuthContext";
import React, { useEffect, useState, type PropsWithChildren } from "react";

export const Root: React.FC<PropsWithChildren> = ({
    children,
}) => {
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    const [darkMode, setDarkMode] = useState(storedDarkMode);
    const toggleTheme = () => setDarkMode((prev) => !prev);

    useEffect(() => {
        localStorage.setItem('darkMode', String(darkMode));
        document.body.classList.toggle('dark', darkMode);
    }, [darkMode]);

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
            <ConfigProvider
                theme={{
                    algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                }}
            >
                <AuthProvider>
                    <ModelsProvider>
                        {children}
                    </ModelsProvider>
                </AuthProvider>
            </ConfigProvider>
        </ThemeContext.Provider>
    );
};
