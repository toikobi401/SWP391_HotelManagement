const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      ws: true,
      xfwd: true,
      onError: (err, req, res) => {
        console.log('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error' });
      }
    })
  );
};