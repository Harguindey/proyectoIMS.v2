const http = require('http');
const httpProxy = require('http-proxy');

const EXPRESS_PORT = process.env.EXPRESS_PORT || 5000;
const PROXY_PORT = process.env.PORT || 3000;

const proxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${EXPRESS_PORT}`,
  ws: true,
  changeOrigin: true,
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(503, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>SportMax Pro</h1><p>Loading... Please wait.</p><script>setTimeout(()=>location.reload(),3000)</script></body></html>');
  }
});

const server = http.createServer((req, res) => {
  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Frontend proxy listening on port ${PROXY_PORT} -> Express on ${EXPRESS_PORT}`);
});
