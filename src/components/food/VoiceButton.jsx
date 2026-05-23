import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { cn } from '@/lib/utils';

export default function VoiceButton({ onTranscribed }) {
  const { isRecording, isTranscribing, startRecording, stopRecording, transcribeAudio } = useVoiceRecorder();

  const handleClick = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (!blob) return;
      const text = await transcribeAudio(blob);
      if (text) onTranscribed(text);
    } else {
      await startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        animate={isRecording ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, repeat: isRecording ? Infinity : 0 }}
      >
        <Button
          type="button"
          size="icon"
          onClick={handleClick}
          disabled={isTranscribing}
          className={cn(
            'rounded-full h-12 w-12 transition-all',
            isRecording
              ? 'bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30'
              : 'bg-secondary hover:bg-secondary/80'
          )}
        >
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin text-foreground" />
          ) : isRecording ? (
            <MicOff className="w-5 h-5 text-destructive-foreground" />
          ) : (
            <Mic className="w-5 h-5 text-foreground" />
          )}
        </Button>
      </motion.div>

      {isRecording && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-0.5"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-destructive rounded-full"
              animate={{ height: ['6px', '16px', '6px'] }}
              transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
            />
          ))}
        </motion.div>
      )}

      <span className="text-[10px] text-muted-foreground font-medium">
        {isTranscribing ? 'Розпізнаю...' : isRecording ? 'Зупинити' : 'Голос'}
      </span>
    </div>
  );
}