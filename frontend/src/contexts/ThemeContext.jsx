import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark', // 기본값: 다크모드
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          // HTML 요소에 테마 클래스 적용
          document.documentElement.setAttribute('data-theme', newTheme);
          return { theme: newTheme };
        }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
    }),
    {
      name: 'berrple-theme',
    }
  )
);

// 초기 테마 설정
const initialTheme = useThemeStore.getState().theme;
document.documentElement.setAttribute('data-theme', initialTheme);

export default useThemeStore;
