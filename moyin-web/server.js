const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// 静态文件服务
app.use(express.static(DIST_DIR));

// 所有非静态请求回退到 index.html（SPA 路由支持）
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Build not found. Please run `npm run build:web` first.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Moyin Web server running on port ${PORT}`);
});
