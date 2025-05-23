'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getFFmpeg } from '@/lib/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { FFmpeg } from '@ffmpeg/ffmpeg'

export default function VideoConverter() {
    const [isReady, setIsReady] = useState(false)
    const [isConverting, setIsConverting] = useState(false)
    const [progress, setProgress] = useState<number>(0)
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
    const { toast } = useToast()
    const inputRef = useRef<HTMLInputElement>(null)
    const ffmpegRef = useRef<FFmpeg | null>(null)

    useEffect(() => {
        const loadFFmpeg = async () => {
            try {
                if (!ffmpegLoaded && !ffmpegRef.current) {
                    const ffmpeg = await getFFmpeg()
                    ffmpegRef.current = ffmpeg
                    setFfmpegLoaded(true)
                    setIsReady(true)
                }
            } catch (error) {
                console.error('Error inicializando FFmpeg:', error)
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Error al inicializar el convertidor"
                })
            }
        }

        loadFFmpeg()
    }, [ffmpegLoaded, toast])

    const convertToMp4 = async (file: File) => {
        if (!ffmpegRef.current || !ffmpegLoaded) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "El convertidor no está listo. Por favor, espera un momento."
            })
            return
        }

        if (file.size > 2147483648) { // 2GB
            toast({
                variant: "destructive",
                title: "Error",
                description: "El archivo es demasiado grande. Máximo 2GB."
            })
            return
        }

        try {
            setIsConverting(true)
            setProgress(0)

            const ffmpeg = ffmpegRef.current
            const { name } = file
            const inputFileName = `input-${Date.now()}.webm`
            const outputFileName = `output-${Date.now()}.mp4`

            toast({
                title: "Procesando",
                description: "La conversión puede tardar varios minutos para videos largos."
            })

            // Escribir el archivo de entrada
            await ffmpeg.writeFile(inputFileName, await fetchFile(file))

            // Configurar el progreso
            ffmpeg.on('progress', ({ progress }) => {
                const percentage = Math.round(progress * 100)
                setProgress(percentage < 0 ? 0 : percentage > 100 ? 100 : percentage)
            })

            // Ejecutar la conversión
            await ffmpeg.exec([
                '-i', inputFileName,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-vsync', 'vfr',
                '-movflags', '+faststart',
                '-af', 'aresample=async=1',
                '-max_muxing_queue_size', '9999',
                '-c:a', 'aac',
                '-b:a', '128k',
                outputFileName
            ])

            // Leer el archivo de salida
            const data = await ffmpeg.readFile(outputFileName)
            const blob = new Blob([data], { type: 'video/mp4' })

            // Limpiar archivos temporales
            await ffmpeg.deleteFile(inputFileName)
            await ffmpeg.deleteFile(outputFileName)

            // Descargar el archivo
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
                description: "Error al convertir el video. Prueba con un archivo más pequeño o de menor duración."
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
                    disabled={isConverting || !isReady}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                    {!isReady
                        ? "Inicializando..."
                        : isConverting 
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