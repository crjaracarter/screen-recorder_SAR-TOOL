const fs = require('fs');
const path = require('path');

// Asegurarse de que el directorio .next/static existe
const staticDir = path.join(process.cwd(), '.next/static');
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

// Copiar los archivos de FFmpeg al directorio .next/static
const ffmpegFiles = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];
ffmpegFiles.forEach(file => {
  const sourcePath = path.join(process.cwd(), 'public', file);
  const targetPath = path.join(staticDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${file} to .next/static`);
  } else {
    console.error(`File ${file} not found in public directory`);
  }
}); 