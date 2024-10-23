import Recorder from '@/components/recorder'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">SAR Tool - Screen and Audio Recorder</h1>
      <Recorder />
    </main>
  )
}