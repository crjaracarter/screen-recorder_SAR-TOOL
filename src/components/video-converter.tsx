'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getFFmpeg } from '@/lib/ffmpeg'
import { fetchFile } from '@ffmpeg/ffmpeg'

type FFmpegInstance = {
   FS: (command: string, ...args: any[]) => any;
   setProgress: (progress: (progress: { ratio: number }) => void) => void;
   run: (...args: string[]) => Promise<void>;
};

export default function VideoConverter() {
   const [isReady, setIsReady] = useState(false)
   const [isConverting, setIsConverting] = useState(false)
   const [progress, setProgress] = useState(0)
   const { toast } = useToast()
   const inputRef = useRef<HTMLInputElement>(null)

   const convertToMp4 = async (file: File) => {
       try {
           setIsConverting(true)
           setProgress(0)

           const ffmpeg = await getFFmpeg() as FFmpegInstance
           if (!isReady) setIsReady(true)

           const { name } = file
           const inputFileName = name
           const outputFileName = `${name.replace('.webm', '')}.mp4`

           ffmpeg.FS('writeFile', inputFileName, await fetchFile(file))

           ffmpeg.setProgress(({ ratio }) => {
               setProgress(Math.round(ratio * 100))
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
           a.download = outputFileName
           document.body.appendChild(a)
           a.click()
           document.body.removeChild(a)
           URL.revokeObjectURL(url)

           toast({
               title: "¡Éxito!",
               description: "Video convertido correctamente"
           })
       } catch (error) {
           console.error(error)
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

               {isConverting && (
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