'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getFFmpeg } from '@/lib/ffmpeg'
import { fetchFile } from '@ffmpeg/ffmpeg'

interface FFmpegProgress {
    ratio: number;
    time?: number;
}

type FFmpegInstance = {
    FS: (command: string, ...args: any[]) => any;
    setProgress: (progress: (progress: FFmpegProgress) => void) => void;
    run: (...args: string[]) => Promise<void>;
    load: () => Promise<void>;
};

export default function VideoConverter() {
    const [isReady, setIsReady] = useState(false)
    const [isConverting, setIsConverting] = useState(false)
    const [progress, setProgress] = useState<number>(0)
    const { toast } = useToast()
    const inputRef = useRef<HTMLInputElement>(null)
    const ffmpegRef = useRef<FFmpegInstance | null>(null)

    const initFFmpeg = async () => {
        try {
            const ffmpeg = await getFFmpeg() as FFmpegInstance
            await ffmpeg.load()
            ffmpegRef.current = ffmpeg
            setIsReady(true)
        } catch (error) {
            console.error('Error inicializando FFmpeg:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error al inicializar el convertidor"
            })
        }
    }

    const convertToMp4 = async (file: File) => {
        if (!ffmpegRef.current) {
            await initFFmpeg()
        }

        try {
            setIsConverting(true)
            setProgress(0)

            const ffmpeg = ffmpegRef.current
            if (!ffmpeg) throw new Error('FFmpeg no está inicializado')

            const { name } = file
            const inputFileName = `input-${Date.now()}.webm`
            const outputFileName = `output-${Date.now()}.mp4`

            ffmpeg.FS('writeFile', inputFileName, await fetchFile(file))

            ffmpeg.setProgress(({ ratio }) => {
                const percentage = Math.round(ratio * 100)
                setProgress(percentage < 0 ? 0 : percentage > 100 ? 100 : percentage)
            })

            await ffmpeg.run(
                '-i', inputFileName,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '22',
                '-c:a', 'aac',
                '-b:a', '128k',
                outputFileName
            )

            const data = ffmpeg.FS('readFile', outputFileName)
            const blob = new Blob([new Uint8Array(data.buffer)], { type: 'video/mp4' })

            // Limpiar archivos
            ffmpeg.FS('unlink', inputFileName)
            ffmpeg.FS('unlink', outputFileName)

            // Descargar archivo
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = name.replace('.webm', '.mp4')
            a.style.display = 'none'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast({
                title: "¡Éxito!",
                description: "Video convertido correctamente"
            })
        } catch (error) {
            console.error('Error en la conversión:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error al convertir el video"
            })
        } finally {
            setIsConverting(false)
            setProgress(0)
        }
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.includes('webm')) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Por favor selecciona un archivo WebM"
            })
            return
        }

        await convertToMp4(file)
    }

    return (
        <Card className="w-full max-w-xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
                <CardTitle className="text-xl font-bold">Convertir WebM a MP4</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <input
                    type="file"
                    accept="video/webm"
                    onChange={handleFileChange}
                    ref={inputRef}
                    className="hidden"
                />

                <Button
                    onClick={() => inputRef.current?.click()}
                    disabled={isConverting}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                    {isConverting 
                        ? `Convirtiendo... ${progress}%` 
                        : 'Seleccionar archivo WebM'
                    }
                </Button>

                {isConverting && progress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}