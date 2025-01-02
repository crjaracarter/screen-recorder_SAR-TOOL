'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toast } from "@/components/ui/toast"
import { Timer } from "@/components/ui/timer"
import { useToast } from "@/hooks/use-toast"

export default function Recorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState('screen')
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
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
      let stream;
      if (recordingType === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            frameRate: { ideal: 60 },
            displaySurface: 'monitor'
          },
          audio: true 
        })
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          } 
        })
      }

      streamRef.current = stream
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: recordingType === 'screen' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus'
      })

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.current.onstop = () => {
        setTimeout(() => {
          const blob = new Blob(chunksRef.current, {
            type: recordingType === 'screen' ? 'video/webm' : 'audio/webm'
          })
          const url = URL.createObjectURL(blob)
          setRecordedMedia(url)
          stream.getTracks().forEach(track => track.stop())
        }, 100)
      }

      mediaRecorder.current.start(1000)
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
        <CardDescription className="text-gray-100">
          Graba tu pantalla o audio con alta calidad
        </CardDescription>
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
            <SelectItem value="screen">📺 Pantalla y Audio</SelectItem>
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

        {recordedMedia && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg overflow-hidden border border-gray-200">
              {recordingType === 'screen' ? (
                <video src={recordedMedia} controls className="w-full" />
              ) : (
                <audio src={recordedMedia} controls className="w-full" />
              )}
            </div>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" asChild>
              <a href={recordedMedia} download={`recording-${new Date().toISOString()}.${recordingType === 'screen' ? 'webm' : 'webm'}`}>
                📥 Descargar Grabación
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}