'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Recorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState('screen')
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordedMedia, setRecordedMedia] = useState<string | null>(null)

  const startRecording = useCallback(async () => {
    setRecordedChunks([])
    setRecordedMedia(null)

    try {
      let stream;
      if (recordingType === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      mediaRecorder.current = new MediaRecorder(stream)

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data])
        }
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks, {
          type: recordingType === 'screen' ? 'video/webm' : 'audio/webm'
        })
        const url = URL.createObjectURL(blob)
        setRecordedMedia(url)
      }

      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error starting recording:", err)
    }
  }, [recordingType, recordedChunks])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Grabador de Pantalla y Audio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select
            onValueChange={(value) => setRecordingType(value)}
            defaultValue={recordingType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select recording type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="screen">Pantalla y Audio -No Mic</SelectItem>
              <SelectItem value="audio">Grabar Micrófono</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex justify-center space-x-4">
            <Button onClick={startRecording} disabled={isRecording}>
              Start Recording
            </Button>
            <Button onClick={stopRecording} disabled={!isRecording}>
              Stop Recording
            </Button>
          </div>

          {recordedMedia && (
            <div className="mt-4">
              {recordingType === 'screen' ? (
                <video src={recordedMedia} controls className="w-full" />
              ) : (
                <audio src={recordedMedia} controls className="w-full" />
              )}
              <Button className="mt-2 w-full" asChild>
                <a href={recordedMedia} download={`recording.${recordingType === 'screen' ? 'webm' : 'wav'}`}>
                  Download Recording
                </a>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}