'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Download, Check, Clock, FileVideo, Mic } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Interfaz para extender MediaStream y permitir guardar las streams originales
interface CombinedMediaStream extends MediaStream {
  __originalStreams?: MediaStream[];
}

// Interfaz para el historial de grabaciones
interface RecordingHistoryItem {
  id: string;
  date: Date;
  type: string;
  duration: number;
  url: string;
  downloaded: boolean;
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
  
  // Nuevos estados para las funcionalidades solicitadas
  const [hasAudio, setHasAudio] = useState(false)
  const [hasMic, setHasMic] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [recordingHistory, setRecordingHistory] = useState<RecordingHistoryItem[]>([])
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null)

  // Cargar historial de localStorage al iniciar
  useEffect(() => {
    const savedHistory = localStorage.getItem('recordingHistory')
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        // Convertir las fechas de string a Date
        const historyWithDates = parsedHistory.map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }))
        setRecordingHistory(historyWithDates)
      } catch (e) {
        console.error('Error al cargar el historial de grabaciones:', e)
      }
    }
  }, [])

  // Guardar historial en localStorage cuando se actualice
  useEffect(() => {
    if (recordingHistory.length > 0) {
      localStorage.setItem('recordingHistory', JSON.stringify(recordingHistory))
    }
  }, [recordingHistory])

  // Temporizador para la duración de la grabación
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  // Limpiar recursos al desmontar
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

  // Prevenir que el usuario cierre la pestaña mientras graba
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault()
        e.returnValue = '¿Estás seguro? La grabación se perderá si cierras esta página.'
        return e.returnValue
      }
      
      // Si hay un video sin descargar, preguntar antes de cerrar
      if (recordedMedia && !isDownloaded) {
        e.preventDefault()
        e.returnValue = '¿Estás seguro? Tienes una grabación sin descargar.'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isRecording, recordedMedia, isDownloaded])

  const startRecording = useCallback(async () => {
    setError(null)
    setRecordedMedia(null)
    setDuration(0)
    chunksRef.current = []
    setIsDownloaded(false)
    setHasAudio(false)
    setHasMic(false)

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
        
        // Verificar si tiene pistas de audio
        setHasAudio(stream.getAudioTracks().length > 0)
      } else if (recordingType === 'screen_mic') {
        // Obtener tanto la captura de pantalla como el micrófono
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            frameRate: { ideal: 60 },
            displaySurface: 'monitor'
          },
          audio: true 
        });
        
        // Verificar si tiene audio del sistema
        setHasAudio(displayStream.getAudioTracks().length > 0)
        
        const micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          } 
        });
        
        // Verificar si tiene micrófono
        setHasMic(micStream.getAudioTracks().length > 0)
        
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
        
        // Verificar si tiene micrófono
        setHasMic(stream.getAudioTracks().length > 0)
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
          
          // Procesar el blob completamente antes de crear la URL
          const arrayBuffer = await blob.arrayBuffer()
          const processedBlob = new Blob([arrayBuffer], { 
            type: recordingType === 'audio' ? 'audio/webm' : 'video/webm'
          })
          
          // Crear un elemento de video temporal para procesar el blob
          if (recordingType !== 'audio') {
            const tempVideo = document.createElement('video')
            tempVideo.src = URL.createObjectURL(processedBlob)
            
            // Esperar a que el video esté completamente cargado
            await new Promise((resolve) => {
              tempVideo.onloadeddata = () => {
                URL.revokeObjectURL(tempVideo.src)
                resolve(null)
              }
            })
          }
          
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
          
          // Generar ID único para esta grabación
          const newRecordingId = `rec_${Date.now()}`
          setCurrentRecordingId(newRecordingId)
          
          // Añadir al historial
          const newHistoryItem: RecordingHistoryItem = {
            id: newRecordingId,
            date: new Date(),
            type: recordingType,
            duration: duration,
            url: url,
            downloaded: false
          }
          
          setRecordingHistory(prev => [newHistoryItem, ...prev])
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
  }, [recordingType, toast, duration])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }, [])
  
  const handleDownload = useCallback(() => {
    if (recordedMedia && currentRecordingId) {
      // Marcar como descargado
      setIsDownloaded(true)
      
      // Actualizar el historial
      setRecordingHistory(prev => 
        prev.map(item => 
          item.id === currentRecordingId 
            ? {...item, downloaded: true} 
            : item
        )
      )
      
      // Mostrar toast de éxito
      toast({
        title: "¡Grabación descargada!",
        description: "Tu grabación se ha descargado correctamente.",
        variant: "default"
      })
    }
  }, [recordedMedia, currentRecordingId, toast])
  
  const loadRecordingFromHistory = useCallback((historyItem: RecordingHistoryItem) => {
    if (isRecording) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No puedes cargar una grabación mientras estás grabando"
      })
      return
    }
    
    setShowHistoryDialog(false)
    setRecordedMedia(historyItem.url)
    setCurrentRecordingId(historyItem.id)
    setIsDownloaded(historyItem.downloaded)
    setRecordingType(historyItem.type)
    setDuration(historyItem.duration)
  }, [isRecording, toast])
  
  const deleteRecordingFromHistory = useCallback((id: string) => {
    // Si la grabación que se está mostrando es la que se elimina
    if (id === currentRecordingId) {
      setRecordedMedia(null)
      setCurrentRecordingId(null)
    }
    
    // Eliminar del historial
    setRecordingHistory(prev => prev.filter(item => item.id !== id))
    
    // Revocar URL para liberar memoria
    const itemToDelete = recordingHistory.find(item => item.id === id)
    if (itemToDelete) {
      URL.revokeObjectURL(itemToDelete.url)
    }
  }, [currentRecordingId, recordingHistory])

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">Magic</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Select
          onValueChange={(value) => setRecordingType(value)}
          defaultValue={recordingType}
          disabled={isRecording}
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
            <div className="flex flex-col items-center space-y-2">
              <div className="text-red-500 animate-pulse font-semibold">
                ⏺ Grabando: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </div>
              
              {/* Indicadores de estado de audio y micrófono */}
              <div className="flex space-x-3 text-sm">
                {(recordingType === 'screen' || recordingType === 'screen_mic') && (
                  <div className={`flex items-center ${hasAudio ? 'text-green-500' : 'text-gray-400'}`}>
                    <FileVideo size={16} className="mr-1" />
                    <span>Audio sistema {hasAudio ? '✓' : '✗'}</span>
                  </div>
                )}
                
                {(recordingType === 'audio' || recordingType === 'screen_mic') && (
                  <div className={`flex items-center ${hasMic ? 'text-green-500' : 'text-gray-400'}`}>
                    <Mic size={16} className="mr-1" />
                    <span>Micrófono {hasMic ? '✓' : '✗'}</span>
                  </div>
                )}
              </div>
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
            <Button
              onClick={() => setShowHistoryDialog(true)}
              disabled={isRecording}
              variant="outline"
              className="border-purple-300 hover:bg-purple-50"
            >
              <Clock className="mr-2 h-4 w-4" /> Historial
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-start">
            <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
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
            <div className="flex flex-col space-y-2">
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center" 
                asChild
                onClick={handleDownload}
              >
                <a href={recordedMedia} download={`recording-${new Date().toISOString()}.webm`}>
                  {isDownloaded ? (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Descargada
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Descargar Grabación
                    </>
                  )}
                </a>
              </Button>
              {!isDownloaded && (
                <div className="text-amber-600 text-sm text-center flex items-center justify-center">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  <span>No has descargado esta grabación</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Diálogo del historial */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Historial de Grabaciones</DialogTitle>
              <DialogDescription>
                Tus grabaciones recientes. Haz clic en una para cargarla.
              </DialogDescription>
            </DialogHeader>
            
            {recordingHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No hay grabaciones en el historial</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                {recordingHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="border-b last:border-b-0 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 px-2 rounded-md"
                    onClick={() => loadRecordingFromHistory(item)}
                  >
                    <div className="flex items-center">
                      {item.type === 'audio' ? (
                        <Mic className="h-5 w-5 mr-2 text-blue-500" />
                      ) : (
                        <FileVideo className="h-5 w-5 mr-2 text-purple-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {item.type === 'audio' ? 'Grabación de audio' : 'Grabación de pantalla'}
                          {item.downloaded && <Check className="h-4 w-4 inline ml-1 text-green-500" />}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.date.toLocaleString()} • {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-50 hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecordingFromHistory(item.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}