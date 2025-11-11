// Simple logger utility

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(logEntry, null, 2));
  } else {
    console.log(JSON.stringify(logEntry));
  }
};

const logger = {
  info: (message, meta) => log('INFO', message, meta),
  warn: (message, meta) => log('WARN', message, meta),
  error: (message, meta) => log('ERROR', message, meta),
  debug: (message, meta) => log('DEBUG', message, meta),
};

module.exports = logger;
