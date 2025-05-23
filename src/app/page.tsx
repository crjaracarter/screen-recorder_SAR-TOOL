import Recorder from '@/components/recorder'
// import VideoConverter from '@/components/video-converter'

export default function Home() {
  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          {/* <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Screen Recorder Tool
          </h1>
          <p className="text-muted-foreground mt-2">
            Graba tu pantalla y audio
          </p> */}
        </header>
        
        <div className="space-y-8">
          <Recorder />
          {/* <VideoConverter /> */}
        </div>

        <footer className="mt-8 text-center text-muted-foreground text-sm">
          <div className="flex flex-col gap-2">
            <p>© 2025 <a href="https://comadev.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 transition-colors">Coma</a>. Todos los derechos reservados.</p>
            <div className="text-xs text-gray-500 flex justify-center items-center gap-2 flex-wrap">
              <span>Desarrollado por <a href="https://comadev.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 transition-colors">Coma</a></span>
              <span>•</span>
              <span>Mejorado con Claude (Anthropic)</span>
              <span>•</span>
              <span>Idea base con v0 (Vercel)</span>
              <span>•</span>
              <span>Versión 3.2 - 23/05/2025</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}