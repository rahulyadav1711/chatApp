import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
const VoiceMessage = ({ src, isOwn }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) {
      return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3 w-[300px] sm:w-[340px] max-w-full py-0 px-1">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer
                    ${
                      isOwn
                        ? "bg-white/90 text-indigo-600 hover:bg-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }
                `}
      >
        {isPlaying ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="relative h-5 flex items-center cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) {
              return;
            }
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = percent * duration;
          }}
        >
          <div
            className={`absolute left-0 right-0 h-[3px] rounded-full
                            ${isOwn ? "bg-white/30" : "bg-white/20"}
                        `}
          />

          <div
            className={`absolute left-0 h-[3px] rounded-full
                            ${isOwn ? "bg-white" : "bg-indigo-400"}
                        `}
            style={{
              width: `${progress}%`,
            }}
          />

          <div
            className={`absolute w-3 h-3 rounded-full
                            ${isOwn ? "bg-white" : "bg-indigo-400"}
                        `}
            style={{
              left: `calc(${progress}% - 6px)`,
            }}
          />
        </div>

        <div
          className={`text-[10px] -mt-0.5 leading-none
                        ${isOwn ? "text-white/70" : "text-gray-400"}
                    `}
        >
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default VoiceMessage;
