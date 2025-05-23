import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg() {
  if (ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  // Cargar los archivos necesarios de FFmpeg
  await ffmpeg.load({
    coreURL: await toBlobURL(`/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}