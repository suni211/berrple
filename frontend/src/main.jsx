import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// 테마에 따른 Toaster 스타일을 동적으로 가져오기
const getToasterStyles = () => {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';

  if (theme === 'light') {
    return {
      style: {
        background: '#FFFFFF',
        color: '#1a1a1a',
        border: '1px solid #00CC66',
      },
      success: {
        iconTheme: {
          primary: '#00CC66',
          secondary: '#FFFFFF',
        },
      },
      error: {
        iconTheme: {
          primary: '#d32f2f',
          secondary: '#FFFFFF',
        },
      },
    };
  }

  return {
    style: {
      background: '#000',
      color: '#fff',
      border: '1px solid #00FF80',
    },
    success: {
      iconTheme: {
        primary: '#00FF80',
        secondary: '#000',
      },
    },
    error: {
      iconTheme: {
        primary: '#ff4444',
        secondary: '#000',
      },
    },
  };
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            ...getToasterStyles(),
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
