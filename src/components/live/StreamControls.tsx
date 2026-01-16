import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  Square,
  Camera,
  Settings,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamControlsProps {
  mediaStream: MediaStream | null;
  isStreaming: boolean;
  isPreparing: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onSwitchCamera: () => void;
  onScreenShare: () => void;
  onStartStream: () => void;
  onStopStream: () => void;
  onOpenSettings: () => void;
  disabled?: boolean;
}

export function StreamControls({
  mediaStream,
  isStreaming,
  isPreparing,
  onToggleCamera,
  onToggleMic,
  onSwitchCamera,
  onScreenShare,
  onStartStream,
  onStopStream,
  onOpenSettings,
  disabled = false,
}: StreamControlsProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const handleToggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
    onToggleCamera();
  };

  const handleToggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
    onToggleMic();
  };

  return (
    <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg">
      {/* Camera Control */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isVideoEnabled ? 'secondary' : 'destructive'}
            size="icon"
            onClick={handleToggleCamera}
            disabled={disabled || !mediaStream}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        </TooltipContent>
      </Tooltip>

      {/* Microphone Control */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isAudioEnabled ? 'secondary' : 'destructive'}
            size="icon"
            onClick={handleToggleMic}
            disabled={disabled || !mediaStream}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        </TooltipContent>
      </Tooltip>

      {/* Switch Camera */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            onClick={onSwitchCamera}
            disabled={disabled || isStreaming}
          >
            <Camera className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Switch camera</TooltipContent>
      </Tooltip>

      {/* Screen Share */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            onClick={onScreenShare}
            disabled={disabled || isStreaming}
          >
            <MonitorUp className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share screen</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-8" />

      {/* Start/Stop Stream */}
      {isStreaming ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              onClick={onStopStream}
              disabled={disabled}
              className="px-6"
            >
              <Square className="h-5 w-5 mr-2 fill-current" />
              End Stream
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop live stream</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="lg"
              onClick={onStartStream}
              disabled={disabled || isPreparing || !mediaStream}
              className={cn(
                'px-6 bg-red-600 hover:bg-red-700',
                isPreparing && 'opacity-70'
              )}
            >
              {isPreparing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Radio className="h-5 w-5 mr-2" />
                  Go Live
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start live stream</TooltipContent>
        </Tooltip>
      )}

      <Separator orientation="vertical" className="h-8" />

      {/* Settings */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            onClick={onOpenSettings}
            disabled={disabled}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Stream settings</TooltipContent>
      </Tooltip>
    </div>
  );
}
