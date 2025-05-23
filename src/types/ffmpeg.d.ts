declare module '@ffmpeg/ffmpeg' {
  export class FFmpeg {
    load(config: { coreURL: string; wasmURL: string }): Promise<void>;
    writeFile(name: string, data: Uint8Array): Promise<void>;
    readFile(name: string): Promise<Uint8Array>;
    exec(args: string[]): Promise<void>;
    deleteFile(name: string): Promise<void>;
  }
}

declare module '@ffmpeg/util' {
  export function fetchFile(file: Blob): Promise<Uint8Array>;
  export function toBlobURL(url: string, type: string): Promise<string>;
} 