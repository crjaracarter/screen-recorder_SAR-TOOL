'use client'

import { useEffect, useState } from 'react'
import { cn } from "@/lib/utils"

interface TimerProps extends React.HTMLAttributes<HTMLDivElement> {
  startTime: number
  isRunning: boolean
  variant?: 'default' | 'destructive' | 'success'
}

export function Timer({ 
  startTime, 
  isRunning, 
  variant = 'default',
  className,
  ...props 
}: TimerProps) {
  const [elapsed, setElapsed] = useState(startTime)

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isRunning) {
      intervalId = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const variantStyles = {
    default: "text-foreground",
    destructive: "text-destructive animate-pulse",
    success: "text-green-500"
  }

  return (
    <div 
      className={cn(
        "font-mono text-lg font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {formatTime(elapsed)}
    </div>
  )
}