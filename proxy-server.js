const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Trust proxy headers (important when behind a reverse proxy like Nginx or Cloudflare)
app.set('trust proxy', true);

// CORS middleware — allow all origins for API routes (proxy handles this)
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret, x-requested-with');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Health check endpoint (useful for load balancers and monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'healthcoin-proxy', timestamp: new Date().toISOString() });
});

// Proxy all /api requests to the NestJS backend
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'warn',
  // Retry on connection errors (API might be restarting)
  onError: (err, req, res) => {
    console.error(`[Proxy Error] ${req.method} ${req.path} -> ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({ message: 'API service temporarily unavailable. Please try again shortly.' });
    }
  },
});

app.use('/api', apiProxy);

// Serve static frontend files with caching headers for better performance
const staticPath = path.join(__dirname, 'apps', 'web', 'dist');
app.use(express.static(staticPath, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // Never cache HTML files (SPA routing)
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA fallback: return index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

const port = process.env.PROXY_PORT || 80;
app.listen(port, '0.0.0.0', () => {
  console.log(`HealthCoin proxy running on http://0.0.0.0:${port}`);
  console.log(`API proxy target: http://localhost:3000`);
  console.log(`Static files served from: ${staticPath}`);
});
