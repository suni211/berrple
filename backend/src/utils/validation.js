// Validation utility functions

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validateUsername = (username) => {
  const regex = /^[a-zA-Z0-9_-]{3,50}$/;
  return regex.test(username);
};

const validatePassword = (password) => {
  return password.length >= 6;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove HTML tags
  return input.replace(/<[^>]*>/g, '');
};

const isValidYouTubeVideoId = (videoId) => {
  const regex = /^[a-zA-Z0-9_-]{11}$/;
  return regex.test(videoId);
};

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
  sanitizeInput,
  isValidYouTubeVideoId
};
