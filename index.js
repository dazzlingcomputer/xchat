const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

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

// 反向代理设置
const proxy = createProxyMiddleware({
  target: 'https://lmarena.ai', // 目标网站
  changeOrigin: true, // 改变请求源
  pathRewrite: {
    '^/': '/', // 重写路径
  },
});

// 设置代理路径
app.use('/', proxy);

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
