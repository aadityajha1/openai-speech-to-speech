"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Send } from "lucide-react";
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import axios from "axios";

interface Message {
  id: string;
  type: "user" | "ai";
  text: string;
  audio: string | null;
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export function SpeechToSpeechAi() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
      };

      synthRef.current = window.speechSynthesis;

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: "audio/webm",
          });
          let chunks: BlobPart[] = [];

          mediaRecorderRef.current.ondataavailable = (e) => {
            chunks.push(e.data);
          };

          mediaRecorderRef.current.onstop = async () => {
            let messageId = Date.now().toString();
            const blob = new Blob(chunks, { type: "audio/webm" });
            chunks = [];
            const fileName = `${messageId}-user-speech.webm`;
            // const wavBlob = convertWebmToWav(webmBlob);
            const audioFile = new File([blob], fileName, {
              type: "audio/webm",
            });
            const formData = new FormData();
            formData.append("file", audioFile);
            let filePath = null;
            let fileNamee = null;
            try {
              const { data } = await axios.post(
                "/api/upload/upload-audio",

                formData
              );
              console.log("Audio uploaded successfully:", data);
              filePath = data.filePath;
              fileNamee = data.fileName;
            } catch (error) {
              console.error("Error uploading audio:", error);
            }
            const audioTranscribe = await axios.post("/api/transcribe", {
              audioFilePath: fileNamee,
            });
            // .then(({ data }) => {
            //   console.log("Audio transcribed successfully:", data);
            // });
            const audioURL = URL.createObjectURL(blob);
            console.log("tttt", transcript);
            console.log(
              "Transcript:",
              transcript,
              audioTranscribe?.data?.transcription
            );
            setMessages((prev) => [
              ...prev,
              {
                id: messageId,
                type: "user",
                text: audioTranscribe?.data?.transcription,
                audio: filePath || audioURL,
              },
            ]);
            handleSubmit(audioTranscribe?.data?.transcription);
            setTranscript("");
          };
        })
        .catch((err) => console.error("Error accessing microphone:", err));
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      mediaRecorderRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const handleSubmit = async (text: string) => {
    if (!text) return;

    setIsLoading(true);
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: text }],
        model: "gpt-3.5-turbo",
      });
      const { data } = await axios.post("/api/chat", {
        question: text,
        chatHistory: [],
      });
      const aiResponse = data.answer; // completion.choices[0].message.content;
      if (aiResponse) {
        let messageId = Date.now().toString();
        const { data } = await axios.post("/api/upload", {
          text: aiResponse,
          messageId,
        });
        const audioFile = data.aiAudioFile;
        speakResponse(
          aiResponse,
          messageId,
          "/uploads/" + audioFile.split("\\").pop()
        );
        console.log("Response from generate ai response audio:", data);
        // aiResponseToAudio(aiResponse);
      }
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      speakResponse(
        "I'm sorry, but I encountered an error while processing your request."
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    console.log("Messages:", messages);
  }, [messages]);

  const speakResponse = (
    text: string,
    messageId?: string,
    audioFile?: string
  ) => {
    console.log("Message ID:", messageId, audioFile);
    if (synthRef.current) {
      setIsSpeaking(true);
      toggleAudioPlayback(audioFile || "");
      setMessages((prev) => [
        ...prev,
        {
          id: messageId || Date.now().toString(),
          type: "ai",
          text,
          audio: audioFile || " ",
        },
      ]);
      // const utterance = new SpeechSynthesisUtterance(text);
      // utterance.onend = () => {
      //   setIsSpeaking(false);
      //   const blob = new Blob([text], { type: "audio/ogg; codecs=opus" });
      //   const audioURL = URL.createObjectURL(blob);
      // };
      // synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleAudioPlayback = (audioUrl: string) => {
    if (currentAudio === audioUrl) {
      audioRef.current?.pause();
      setCurrentAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setCurrentAudio(audioUrl);
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "user",
          text: inputText,
          audio: null,
        },
      ]);
      handleSubmit(inputText);
      setInputText("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">
          AI Speech Conversation
        </h1>

        <div className="mb-4 h-96 overflow-y-auto">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-4 p-4 rounded-lg ${
                  message.type === "user"
                    ? "bg-blue-100 ml-auto"
                    : "bg-gray-100"
                } max-w-[80%]`}
              >
                <p
                  className={`text-sm ${
                    message.type === "user" ? "text-blue-800" : "text-gray-800"
                  }`}
                >
                  {message.text}
                </p>
                {message.audio && (
                  <button
                    onClick={() => toggleAudioPlayback(message.audio!)}
                    className={`mt-2 p-2 rounded-full ${
                      currentAudio === message.audio
                        ? "bg-red-500"
                        : "bg-green-500"
                    } text-white`}
                  >
                    {currentAudio === message.audio ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mb-4 p-4 bg-gray-100 rounded-lg min-h-[60px] relative">
          <p className="text-gray-700">
            {transcript || "Speak or type your message..."}
          </p>
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

        <form onSubmit={handleTextSubmit} className="mb-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </form>

        <div className="flex justify-between items-center mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleListening}
            className={`px-4 py-2 rounded-full ${
              isListening ? "bg-red-500 text-white" : "bg-blue-500 text-white"
            }`}
          >
            {isListening ? "Stop" : "Start"} Listening
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSubmit(inputText)}
            disabled={(!inputText && !transcript) || isLoading}
            className={`px-4 py-2 rounded-full ${
              (!inputText && !transcript) || isLoading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 text-white"
            }`}
          >
            {isLoading ? "Processing..." : <Send size={18} />}
          </motion.button>
        </div>

        <audio ref={audioRef} onEnded={() => setCurrentAudio(null)} />
      </motion.div>
    </div>
  );
}
