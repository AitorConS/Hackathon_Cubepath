'use client'

import { AlertCircle, X } from 'lucide-react'

interface ErrorAlertProps {
  title: string
  message: string
  onClose: () => void
  type?: 'error' | 'warning'
}

export default function ErrorAlert({ 
  title, 
  message, 
  onClose, 
  type = 'error' 
}: ErrorAlertProps) {
  const bgColor = type === 'error' ? 'bg-red-500/10' : 'bg-yellow-500/10'
  const borderColor = type === 'error' ? 'border-red-500/30' : 'border-yellow-500/30'
  const titleColor = type === 'error' ? 'text-red-400' : 'text-yellow-400'
  const iconColor = type === 'error' ? 'text-red-400' : 'text-yellow-400'
  const closeButtonColor = type === 'error' 
    ? 'hover:bg-red-500/20' 
    : 'hover:bg-yellow-500/20'

  return (
    <div className={`fixed top-6 right-6 z-50 w-96 max-w-[calc(100%-2rem)] ${bgColor} border ${borderColor} rounded-xl p-4 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <AlertCircle className="w-5 h-5 mt-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${titleColor} mb-1`}>{title}</h3>
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 text-gray-400 ${closeButtonColor} rounded-lg p-1 transition-colors`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
