import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersAPI = {
  getProfile: (username) => api.get(`/users/${username}`),
  updateProfile: (data) => api.put('/users/profile', data),
  getChannels: (username) => api.get(`/users/${username}/channels`),
  getMySubscriptions: () => api.get('/users/me/subscriptions'),
};

// Channels API
export const channelsAPI = {
  getChannel: (handle) => api.get(`/channels/${handle}`),
  createChannel: (data) => api.post('/channels', data),
  updateChannel: (handle, data) => api.put(`/channels/${handle}`, data),
  isSubscribed: (handle) => api.get(`/channels/${handle}/is-subscribed`),
  subscribe: (handle) => api.post(`/channels/${handle}/subscribe`),
  unsubscribe: (handle) => api.delete(`/channels/${handle}/subscribe`),
  getVideos: (handle, params) => api.get(`/channels/${handle}/videos`, { params }),
};

// Videos API
export const videosAPI = {
  getVideo: (id) => api.get(`/videos/${id}`),
  getVideos: (params) => api.get('/videos', { params }),
  createVideo: (data) => api.post('/videos', data),
  updateVideo: (id, data) => api.put(`/videos/${id}`, data),
  deleteVideo: (id) => api.delete(`/videos/${id}`),
  searchVideos: (query, params) => api.get('/videos/search/query', { params: { q: query, ...params } }),
};

// Clouds API
export const cloudsAPI = {
  getClouds: (videoId) => api.get(`/clouds/video/${videoId}`),
  getLatestClouds: (limit) => api.get('/clouds/latest', { params: { limit } }),
  getRecentCloudVideos: (limit) => api.get('/clouds/recent-videos', { params: { limit } }),
  createCloud: (data) => api.post('/clouds', data),
  deleteCloud: (id) => api.delete(`/clouds/${id}`),
  likeCloud: (id) => api.post(`/clouds/${id}/like`),
  unlikeCloud: (id) => api.delete(`/clouds/${id}/like`),
  flagCloud: (id, reason) => api.post(`/clouds/${id}/flag`, { reason }),
};

// Posts API
export const postsAPI = {
  getPosts: (boardType, params) => api.get(`/posts/${boardType}`, { params }),
  getPost: (id) => api.get(`/posts/post/${id}`),
  createPost: (data) => api.post('/posts', data),
  updatePost: (id, data) => api.put(`/posts/${id}`, data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  likePost: (id) => api.post(`/posts/${id}/like`),
  unlikePost: (id) => api.delete(`/posts/${id}/like`),
  getComments: (id) => api.get(`/posts/${id}/comments`),
  createComment: (id, data) => api.post(`/posts/${id}/comments`, data),
  deleteComment: (commentId) => api.delete(`/posts/comments/${commentId}`),
};

// Tags API
export const tagsAPI = {
  getTags: (limit) => api.get('/tags', { params: { limit } }),
  getPopularTags: (limit) => api.get('/tags/popular', { params: { limit } }),
  getTagVideos: (tagName, params) => api.get(`/tags/${tagName}/videos`, { params }),
};

// Upload API
export const uploadAPI = {
  uploadVideo: (formData, onProgress) => api.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  }),
  uploadThumbnail: (formData) => api.post('/upload/thumbnail', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// YouTube API
export const youtubeAPI = {
  search: (query, params) => api.get('/youtube/search', { params: { q: query, ...params } }),
  getVideo: (videoId) => api.get(`/youtube/video/${videoId}`),
  getCategories: () => api.get('/youtube/categories'),
  getStreamUrl: (videoId) => api.get(`/youtube/stream/${videoId}`),
};

export default api;
