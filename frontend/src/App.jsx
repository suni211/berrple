import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import VideoPage from './pages/VideoPage';
import YouTubeVideoPage from './pages/YouTubeVideoPage';
import ChannelPage from './pages/ChannelPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import YouTubeSearchPage from './pages/YouTubeSearchPage';
import BoardPage from './pages/BoardPage';
import PostPage from './pages/PostPage';
import CreatePostPage from './pages/CreatePostPage';
import MyPage from './pages/MyPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CopyrightPage from './pages/CopyrightPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="watch/:videoId" element={<VideoPage />} />
        <Route path="youtube/:videoId" element={<YouTubeVideoPage />} />
        <Route path="channel/:channelHandle" element={<ChannelPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="youtube-search" element={<YouTubeSearchPage />} />
        <Route path="board/:boardType" element={<BoardPage />} />
        <Route path="post/:postId" element={<PostPage />} />
        <Route path="copyright" element={<CopyrightPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route path="upload" element={
          <ProtectedRoute>
            <UploadPage />
          </ProtectedRoute>
        } />
        <Route path="board/:boardType/create" element={
          <ProtectedRoute>
            <CreatePostPage />
          </ProtectedRoute>
        } />
        <Route path="mypage" element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
