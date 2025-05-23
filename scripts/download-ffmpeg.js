const https = require('https');
const fs = require('fs');
const path = require('path');

const FFMPEG_VERSION = '0.12.7';
const FILES = [
  {
    url: `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/ffmpeg-core.js`,
    path: 'public/ffmpeg-core.js'
  },
  {
    url: `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/ffmpeg-core.wasm`,
    path: 'public/ffmpeg-core.wasm'
  }
];

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  // Crear directorio public si no existe
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
  }

  for (const file of FILES) {
    console.log(`Downloading ${file.url}...`);
    await downloadFile(file.url, file.path);
    console.log(`Downloaded to ${file.path}`);
  }
}

main().catch(console.error); 