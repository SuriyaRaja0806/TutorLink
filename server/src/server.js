const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(config.port, () => {
      console.log(`[Server] TutorLink API running on http://localhost:${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (err) {
    console.error(`[Server] Failed to start server:`, err.message);
    process.exit(1);
  }
};

const handleShutdown = async (signal) => {
  console.log(`[Server] ${signal} signal received. Closing HTTP server and DB connection...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, server };
