"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Send } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
  audio: string | null
}

export function SpeechToSpeechAi() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)
  const [streamedText, setStreamedText] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex
        const transcript = event.results[current][0].transcript
        setTranscript(transcript)
      }

      synthRef.current = window.speechSynthesis

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaRecorderRef.current = new MediaRecorder(stream)
          let chunks: BlobPart[] = []

          mediaRecorderRef.current.ondataavailable = (e) => {
            chunks.push(e.data)
          }

          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' })
            chunks = []
            const audioURL = URL.createObjectURL(blob)
            setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', text: transcript, audio: audioURL }])
            setTranscript('')
          }
        })
        .catch(err => console.error('Error accessing microphone:', err))
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      mediaRecorderRef.current?.stop()
    } else {
      recognitionRef.current?.start()
      mediaRecorderRef.current?.start()
    }
    setIsListening(!isListening)
  }

  const handleSubmit = async () => {
    if (!transcript) return

    setIsLoading(true)
    // Simulated API call to OpenAI
    const aiResponse = "This is a simulated AI response. In a real application, this would be the response from the OpenAI API."
    setIsLoading(false)
    await streamResponse(aiResponse)
  }

  const streamResponse = async (text: string) => {
    setIsSpeaking(true)
    setStreamedText('')
    
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onend = () => {
        setIsSpeaking(false)
        const blob = new Blob([text], { type: 'audio/ogg; codecs=opus' })
        const audioURL = URL.createObjectURL(blob)
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'ai', text, audio: audioURL }])
        setStreamedText('')
      }
      
      synthRef.current.speak(utterance)

      for (let i = 0; i < text.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50))
        setStreamedText(prev => prev + text[i])
      }
    }
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      setStreamedText('')
    }
  }

  const toggleAudioPlayback = (audioUrl: string) => {
    if (currentAudio === audioUrl) {
      audioRef.current?.pause()
      setCurrentAudio(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        setCurrentAudio(audioUrl)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">AI Speech Conversation</h1>
        
        <div className="mb-4 h-96 overflow-y-auto">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-4 p-4 rounded-lg ${
                  message.type === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
                } max-w-[80%]`}
              >
                <p className={`text-sm ${message.type === 'user' ? 'text-blue-800' : 'text-gray-800'}`}>
                  {message.text}
                </p>
                {message.audio && (
                  <button
                    onClick={() => toggleAudioPlayback(message.audio!)}
                    className={`mt-2 p-2 rounded-full ${
                      currentAudio === message.audio ? 'bg-red-500' : 'bg-green-500'
                    } text-white`}
                  >
                    {currentAudio === message.audio ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg bg-gray-100 max-w-[80%]"
            >
              <p className="text-sm text-gray-800">{streamedText}</p>
            </motion.div>
          )}
        </div>

        <div className="mb-4 p-4 bg-gray-100 rounded-lg min-h-[60px] relative">
          <p className="text-gray-700">{transcript || "Speak or type your message..."}</p>
          <motion.div
            className="absolute bottom-2 right-2"
            animate={{ scale: isListening ? 1.1 : 1 }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            {isListening ? (
              <Mic className="text-red-500" size={24} />
            ) : (
              <MicOff className="text-gray-400" size={24} />
            )}
          </motion.div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleListening}
            className={`px-4 py-2 rounded-full ${
              isListening ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
            }`}
          >
            {isListening ? 'Stop' : 'Start'} Listening
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!transcript || isLoading}
            className={`px-4 py-2 rounded-full ${
              !transcript || isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 text-white'
            }`}
          >
            {isLoading ? 'Processing...' : <Send size={18} />}
          </motion.button>
        </div>

        <audio ref={audioRef} onEnded={() => setCurrentAudio(null)} />
      </motion.div>
    </div>
  )
}