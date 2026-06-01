import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import Colors from '../constants/Colors';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  
  const isDarkMode = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;
  
  return {
    isDarkMode,
    theme,
    themeMode,
  };
}
