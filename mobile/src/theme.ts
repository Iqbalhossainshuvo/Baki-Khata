import { useColorScheme } from 'react-native';

const light = {
  bg: '#f2f2f7', card: '#ffffff', text: '#1c1c1e', sub: '#8e8e93', sep: 'rgba(60,60,67,0.18)',
  blue: '#007aff', red: '#ff3b30', green: '#34c759', fill: 'rgba(118,118,128,0.12)', seg: '#ffffff',
  dark: false,
};
const dark: typeof light = {
  bg: '#000000', card: '#1c1c1e', text: '#ffffff', sub: '#8e8e93', sep: 'rgba(84,84,88,0.6)',
  blue: '#0a84ff', red: '#ff453a', green: '#30d158', fill: 'rgba(118,118,128,0.24)', seg: '#636366',
  dark: true,
};
export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);

export const font = {
  regular: 'HindSiliguri_400Regular',
  medium: 'HindSiliguri_500Medium',
  semibold: 'HindSiliguri_600SemiBold',
  bold: 'HindSiliguri_700Bold',
};
