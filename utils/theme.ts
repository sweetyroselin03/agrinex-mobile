
export const lightTheme = {
    bg: '#F5F7FA',
    card: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.08)',
    borderFocus: '#00E38C',
    textPrimary: '#0B1220',
    textMuted: 'rgba(0,0,0,0.5)',
    primary: '#00E38C',
    primaryEnd: '#00C97B',
    statusBar: 'dark-content' as const,
    gradientStart: 'rgba(0,217,139,0.08)',
};

export const darkTheme = {
    bg: '#0B1220',
    card: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.08)',
    borderFocus: '#00E38C',
    textPrimary: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.55)',
    primary: '#00E38C',
    primaryEnd: '#00C97B',
    statusBar: 'light-content' as const,
    gradientStart: 'rgba(0,217,139,0.08)',
};

import { useAppTheme } from '../hooks/useAppTheme';

export function useTheme() {
    const { isDarkMode } = useAppTheme();
    return isDarkMode ? darkTheme : lightTheme;
}