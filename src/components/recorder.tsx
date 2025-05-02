'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// Interfaz para extender MediaStream y permitir guardar las streams originales
interface CombinedMediaStream extends MediaStream {
  __originalStreams?: MediaStream[];
}

export default function Recorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingType, setRecordingType] = useState('screen')
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<CombinedMediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recordedMedia, setRecordedMedia] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (recordedMedia) {
        URL.revokeObjectURL(recordedMedia)
      }
    }
  }, [recordedMedia])

  const startRecording = useCallback(async () => {
    setError(null)
    setRecordedMedia(null)
    setDuration(0)
    chunksRef.current = []

    try {
      let stream: CombinedMediaStream;
      
      if (recordingType === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            frameRate: { ideal: 60 },
            displaySurface: 'monitor'
          },
          audio: true 
        }) as CombinedMediaStream;
      } else if (recordingType === 'screen_mic') {
        // Obtener tanto la captura de pantalla como el micrófono
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            frameRate: { ideal: 60 },
            displaySurface: 'monitor'
          },
          audio: true 
        });
        
        const micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          } 
        });
        
        // Combinar las pistas de audio y video
        const tracks = [
          ...displayStream.getVideoTracks(),
          ...displayStream.getAudioTracks(),
          ...micStream.getAudioTracks()
        ];
        
        stream = new MediaStream(tracks) as CombinedMediaStream;
        
        // Guardar referencia a las transmisiones originales para poder detenerlas después
        stream.__originalStreams = [displayStream, micStream];
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          } 
        }) as CombinedMediaStream;
      }

      streamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: recordingType === 'audio' ? 'audio/webm;codecs=opus' : 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.current.onstop = async () => {
        setIsProcessing(true)
        try {
          const blob = new Blob(chunksRef.current, {
            type: recordingType === 'audio' ? 'audio/webm' : 'video/webm'
          })
          
          // Procesar el blob antes de crear la URL
          const arrayBuffer = await blob.arrayBuffer()
          const processedBlob = new Blob([arrayBuffer], { type: blob.type })
          const url = URL.createObjectURL(processedBlob)
          
          setRecordedMedia(url)
          
          // Detener todas las pistas
          if (stream.__originalStreams?.length) {
            stream.__originalStreams.forEach((originalStream: MediaStream) => {
              originalStream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
            })
          } else {
            stream.getTracks().forEach(track => track.stop())
          }
        } catch (err) {
          console.error("Error processing recording:", err)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al procesar la grabación"
          })
        } finally {
          setIsProcessing(false)
        }
      }

      mediaRecorder.current.start(200)
      setIsRecording(true)
    } catch (err) {
      console.error("Error starting recording:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Error al iniciar la grabación'
      })
    }
  }, [recordingType, toast])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }, [])

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">Grabador de Pantalla y audio</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Select
          onValueChange={(value) => setRecordingType(value)}
          defaultValue={recordingType}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona tipo de grabación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="screen">📺 Pantalla y Audio del Sistema</SelectItem>
            <SelectItem value="screen_mic">🎬 Pantalla + Audio + Micrófono</SelectItem>
            <SelectItem value="audio">🎤 Solo Micrófono</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-col items-center space-y-4">
          {isRecording && (
            <div className="text-red-500 animate-pulse">
              ⏺ Grabando: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </div>
          )}

          <div className="flex space-x-4">
            <Button 
              onClick={startRecording} 
              disabled={isRecording}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isRecording ? '⏺ Grabando...' : '▶ Iniciar Grabación'}
            </Button>
            <Button 
              onClick={stopRecording} 
              disabled={!isRecording}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              ⏹ Detener
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Procesando grabación...</p>
          </div>
        )}

        {recordedMedia && !isProcessing && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg overflow-hidden border border-gray-200">
              {recordingType === 'audio' ? (
                <audio src={recordedMedia} controls className="w-full" />
              ) : (
                <video src={recordedMedia} controls className="w-full" />
              )}
            </div>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" asChild>
              <a href={recordedMedia} download={`recording-${new Date().toISOString()}.webm`}>
                📥 Descargar Grabación
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}