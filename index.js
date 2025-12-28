const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const NodeCache = require('node-cache');
const https = require('https');
const fs = require('fs');

// 创建应用实例
const app = express();

// 启用CORS
app.use(cors());

// 启用安全头
app.use(helmet());

// 设置访问频率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多请求100次
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// 创建缓存实例，缓存时效为 60 秒
const cache = new NodeCache({ stdTTL: 60 });

// 反向代理设置
const proxy = createProxyMiddleware({
  target: 'https://lmarena.ai', // 目标网站
  changeOrigin: true, // 改变请求源
  pathRewrite: {
    '^/': '/', // 重写路径
  },
  onProxyReq: (proxyReq, req, res) => {
    // 如果缓存存在，直接返回缓存内容
    const cacheKey = req.url;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      res.send(cachedResponse);
      return;
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    let body = [];
    proxyRes.on('data', (chunk) => {
      body.push(chunk);
    });
    proxyRes.on('end', () => {
      body = Buffer.concat(body);
      const cacheKey = req.url;
      cache.set(cacheKey, body); // 将响应数据缓存
      res.setHeader('X-Cache', 'MISS');
      res.send(body);
    });
  },
});

// 设置代理路径
app.use('/', proxy);

// 启动服务器
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV === 'production') {
  // 如果是生产环境，使用 HTTPS 启动
  https.createServer({
    key: fs.readFileSync('./path/to/private-key.pem'),
    cert: fs.readFileSync('./path/to/certificate.pem'),
  }, app).listen(port, () => {
    console.log(`HTTPS Proxy server running on port ${port}`);
  });
} else {
  // 否则，使用 HTTP 启动
  app.listen(port, () => {
    console.log(`Proxy server running on port ${port}`);
  });
}
