import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveStreamPreviewProps {
  mediaStream: MediaStream | null;
  isStreaming: boolean;
  viewerCount?: number;
  duration?: number;
  className?: string;
}

export function LiveStreamPreview({
  mediaStream,
  isStreaming,
  viewerCount = 0,
  duration = 0,
  className,
}: LiveStreamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Set video source
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // Audio level meter
  useEffect(() => {
    if (!mediaStream) return;

    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('Error setting up audio analyser:', error);
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, [mediaStream]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasVideo = mediaStream?.getVideoTracks().some(t => t.enabled);
  const hasAudio = mediaStream?.getAudioTracks().some(t => t.enabled);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0 relative">
        {/* Video Preview */}
        <div className="relative aspect-video bg-black">
          {mediaStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="w-16 h-16 text-muted-foreground" />
            </div>
          )}

          {/* Live Badge */}
          {isStreaming && (
            <Badge 
              className="absolute top-4 left-4 bg-red-600 text-white animate-pulse"
            >
              🔴 LIVE
            </Badge>
          )}

          {/* Status Overlays */}
          <div className="absolute top-4 right-4 flex gap-2">
            {isStreaming && (
              <>
                <Badge variant="secondary" className="bg-black/50 text-white">
                  <Users className="w-3 h-3 mr-1" />
                  {viewerCount}
                </Badge>
                <Badge variant="secondary" className="bg-black/50 text-white">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDuration(duration)}
                </Badge>
              </>
            )}
          </div>

          {/* Media Status */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Badge 
              variant="secondary" 
              className={cn(
                'bg-black/50',
                hasVideo ? 'text-green-400' : 'text-red-400'
              )}
            >
              {hasVideo ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn(
                'bg-black/50',
                hasAudio ? 'text-green-400' : 'text-red-400'
              )}
            >
              {hasAudio ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </Badge>
          </div>

          {/* Audio Level Meter */}
          {hasAudio && (
            <div className="absolute bottom-4 right-4 flex items-end gap-0.5 h-8">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-full transition-all',
                    audioLevel > i / 10
                      ? i < 3 ? 'bg-green-500' : i < 7 ? 'bg-yellow-500' : 'bg-red-500'
                      : 'bg-muted'
                  )}
                  style={{ height: `${(i + 1) * 10}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
