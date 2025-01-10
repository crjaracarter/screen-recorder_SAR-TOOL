import { createFFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core@0.8.5/dist/ffmpeg-core.js'
});

let loaded = false;

export const getFFmpeg = async () => {
  if (loaded) {
    return ffmpeg;
  }

  await ffmpeg.load();
  loaded = true;
  return ffmpeg;
};