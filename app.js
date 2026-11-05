const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pkg = require('./package.json');

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: isDev ? '*' : 'https://yourdomain.com',
}));

// API Endpoint ส่งค่า version และ metadata จาก package.json
app.get('/api/version', (req, res) => {
  const cleanVersion = (pkg.version || '1.0.0').replace(/^v/, '');
  const versionTag = `v${cleanVersion}`;
  res.json({
    name: pkg.name,
    version: pkg.version,
    tag: versionTag,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Helper ฟังก์ชันสำหรับแทนที่ตัวแปร version ใน HTML ก่อนส่งให้ client
const renderHtmlWithVersion = (fileName, res) => {
  const filePath = path.join(__dirname, 'public', fileName);
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      return res.sendFile(filePath);
    }
    const cleanVersion = (pkg.version || '1.0.0').replace(/^v/, '');
    const versionTag = `v${cleanVersion}`;
    const rendered = html
      .replace(/{{VERSION}}/g, versionTag)
      .replace(/{{RAW_VERSION}}/g, cleanVersion)
      .replace(/{{APP_NAME}}/g, pkg.name || 'nginx-node-test');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(rendered);
  });
};

app.get('/', (req, res) => {
  renderHtmlWithVersion('index.html', res);
});

app.get('/test', (req, res) => {
  renderHtmlWithVersion('test.html', res);
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
