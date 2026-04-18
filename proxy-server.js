const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Proxy all /api requests to the NestJS backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'apps', 'web', 'dist')));

// SPA fallback: return index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'apps', 'web', 'dist', 'index.html'));
});

const port = process.env.PROXY_PORT || 80;
app.listen(port, '0.0.0.0', () => {
  console.log(`HealthCoin proxy running on http://0.0.0.0:${port}`);
});
