import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  onAiAction: (transcript?: string, aiData?: any) => void;
}

export default function VoiceButton({ onAiAction }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = useCallback(async () => {
    if (isProcessing) return;

    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        // audio tracks cleanup occurs inside the onstop listener naturally
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Sever hardware audio stream instantly to release user mic
        stream.getTracks().forEach(track => track.stop());

        try {
          // 1. Send Audio binary to backend transcriber (Whisper)
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice_command.webm');
          
          const tRes = await fetch('http://localhost:3001/api/ai/transcribe', {
            method: 'POST',
            body: formData
          });
          const tData = await tRes.json();
          
          if (!tRes.ok) throw new Error(tData.error || 'Failed to transcribe audio.');
          
          const transcript = tData.transcript || tData.mockTranscript || '';

          // 2. Pass resulting transcription up to Agentic Execution logic
          const xRes = await fetch('http://localhost:3001/api/ai/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript })
          });
          const xData = await xRes.json();

          // Bubble payload to UI regardless of pass/fail so they see result
          onAiAction(transcript, xData);

        } catch (err) {
          console.error("Agent Pipeline disconnected:", err);
          onAiAction(undefined, { error: err instanceof Error ? err.message : 'Unknown AI Error' });
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Hardware Mic access blocked:", err);
      // Give feedback if hardware request fails
      onAiAction(undefined, { error: 'Please allow microphone access in your browser to use the Assistant.' });
    }
  }, [isRecording, isProcessing, onAiAction]);

  return (
    <div className="absolute top-[61%] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
      <motion.button
        onClick={toggleRecording}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        animate={isRecording ? { boxShadow: "0px 0px 20px 4px rgba(224,123,108,0.3)" } : {}}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${ 
          isRecording 
            ? 'bg-[#E07B6C] text-white shadow-lg scale-110' 
            : 'bg-white/10 dark:bg-white/5 backdrop-blur border border-black/5 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
        }`}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <Mic className={`w-[22px] h-[22px] ${isRecording ? 'animate-pulse' : ''}`} strokeWidth={isRecording ? 2.5 : 2} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      
      {/* Listening status indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.span 
            initial={{ opacity: 0, y: 5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.8 }}
            className="absolute top-14 text-[9px] font-bold tracking-widest uppercase text-[#E07B6C] bg-[#E07B6C]/10 px-3 py-1 rounded-full whitespace-nowrap backdrop-blur border border-[#E07B6C]/20"
          >
            Listening...
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
