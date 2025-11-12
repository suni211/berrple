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
      onRehydrateStorage: () => (state) => {
        // localStorage에서 복원된 후 테마 적용
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

// 초기 테마 설정 - SSR 고려
if (typeof window !== 'undefined') {
  const storedTheme = localStorage.getItem('berrple-theme');
  if (storedTheme) {
    try {
      const { state } = JSON.parse(storedTheme);
      if (state?.theme) {
        document.documentElement.setAttribute('data-theme', state.theme);
      }
    } catch (e) {
      // 파싱 실패 시 기본 테마 적용
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } else {
    // localStorage에 저장된 테마가 없으면 기본 테마 적용
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

export default useThemeStore;
