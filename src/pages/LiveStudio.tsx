import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Radio, 
  Users, 
  Clock, 
  MessageSquare,
  Loader2,
  History,
  Eye,
  Play,
  BarChart3,
  Layers,
  Shield,
} from 'lucide-react';
import { LiveStreamPreview } from '@/components/live/LiveStreamPreview';
import { StreamControls } from '@/components/live/StreamControls';
import { PlatformConnector } from '@/components/live/PlatformConnector';
import { LiveChat } from '@/components/live/LiveChat';
import { StreamSettingsDialog } from '@/components/live/StreamSettingsDialog';
import { StreamPolls } from '@/components/live/StreamPolls';
import { StreamOverlays } from '@/components/live/StreamOverlays';
import { ChatModerator } from '@/components/live/ChatModerator';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChatMessages } from '@/hooks/useLiveChatMessages';
import { format, formatDistanceStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function LiveStudio() {
  const { toast } = useToast();
  const {
    stream,
    streams,
    mediaStream,
    isStreaming,
    isPreparing,
    error,
    createStream,
    startStreaming,
    stopStreaming,
    getMediaStream,
    getScreenShare,
  } = useLiveStream();

  const {
    messages: chatMessages,
    deleteMessage,
  } = useLiveChatMessages({ streamId: stream?.id || null, isStreaming });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [activeTab, setActiveTab] = useState('chat');
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duration timer
  useEffect(() => {
    if (isStreaming && stream?.started_at) {
      durationInterval.current = setInterval(() => {
        const start = new Date(stream.started_at!).getTime();
        const now = Date.now();
        setStreamDuration(Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      setStreamDuration(0);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isStreaming, stream?.started_at]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateStream = async () => {
    if (!title.trim()) {
      toast({ title: 'Please enter a stream title', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    const newStream = await createStream(title, description);
    setIsCreating(false);

    if (newStream) {
      toast({ title: 'Stream created!', description: 'You can now go live.' });
    }
  };

  const handleStartCamera = async () => {
    const mediaStream = await getMediaStream(true, true);
    if (mediaStream) {
      toast({ title: 'Camera ready', description: 'Your camera and microphone are now active.' });
    }
  };

  const handleStartScreenShare = async () => {
    const screenStream = await getScreenShare();
    if (screenStream) {
      toast({ title: 'Screen sharing', description: 'You are now sharing your screen.' });
    }
  };

  const handleGoLive = async () => {
    const success = await startStreaming();
    if (success) {
      toast({ title: "You're live!", description: 'Your stream is now broadcasting.' });
    }
  };

  const handleEndStream = async () => {
    const success = await stopStreaming();
    if (success) {
      toast({ title: 'Stream ended', description: 'Your stream has been saved.' });
      setTitle('');
      setDescription('');
    }
  };

  const handleToggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  const handleToggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const pastStreams = streams.filter(s => s.status === 'ended').slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Video className="w-7 h-7 text-primary" />
              Live Studio
            </h1>
            <p className="text-muted-foreground">
              Stream to multiple platforms simultaneously
            </p>
          </div>
          <div className="flex items-center gap-4">
            {stream && <StreamSettingsDialog stream={stream} />}
            {isStreaming && (
              <>
                <Badge variant="destructive" className="animate-pulse flex items-center gap-2">
                  <Radio className="w-3 h-3" />
                  LIVE
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono">{formatDuration(streamDuration)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{stream?.viewer_count || 0} viewers</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Preview Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stream Setup or Preview */}
            {!stream ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Stream</CardTitle>
                  <CardDescription>
                    Set up your stream details before going live
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Stream Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter your stream title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="What's your stream about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleCreateStream}
                    disabled={isCreating || !title.trim()}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Create Stream
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stream Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{stream.title}</CardTitle>
                        {stream.description && (
                          <CardDescription className="mt-1">
                            {stream.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={
                        stream.status === 'live' ? 'destructive' : 
                        stream.status === 'preparing' ? 'secondary' : 
                        'outline'
                      }>
                        {stream.status}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Video Preview */}
                <LiveStreamPreview
                  mediaStream={mediaStream}
                  isStreaming={isStreaming}
                  viewerCount={stream.viewer_count || 0}
                />

                {/* Stream Controls */}
                <StreamControls
                  mediaStream={mediaStream}
                  isStreaming={isStreaming}
                  isPreparing={isPreparing}
                  onToggleCamera={handleToggleCamera}
                  onToggleMic={handleToggleMic}
                  onSwitchCamera={() => handleStartCamera()}
                  onScreenShare={handleStartScreenShare}
                  onStartStream={handleGoLive}
                  onStopStream={handleEndStream}
                  onOpenSettings={() => {}}
                />
              </>
            )}

            {/* Platform Connector */}
            {stream && (
              <PlatformConnector streamId={stream.id} isStreaming={isStreaming} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="chat" className="text-xs">
                  <MessageSquare className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="polls" className="text-xs">
                  <BarChart3 className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="overlays" className="text-xs">
                  <Layers className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="moderation" className="text-xs">
                  <Shield className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-4">
                <LiveChat streamId={stream?.id} isStreaming={isStreaming} isOwner={true} />
              </TabsContent>

              <TabsContent value="polls" className="mt-4">
                <StreamPolls streamId={stream?.id || null} isStreaming={isStreaming} isOwner={true} />
              </TabsContent>

              <TabsContent value="overlays" className="mt-4">
                <StreamOverlays streamId={stream?.id || null} />
              </TabsContent>

              <TabsContent value="moderation" className="mt-4">
                <ChatModerator
                  streamId={stream?.id || null}
                  messages={chatMessages}
                  onDeleteMessage={deleteMessage}
                />
              </TabsContent>
            </Tabs>

            {/* Past Streams - Only show when no active stream */}
            {!stream && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Past Streams
                  </CardTitle>
                  <CardDescription>Your recent broadcasts</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {pastStreams.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No past streams yet</p>
                        <p className="text-sm">Your completed streams will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pastStreams.map((pastStream) => (
                          <div
                            key={pastStream.id}
                            className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <h4 className="font-medium text-sm truncate">
                              {pastStream.title}
                            </h4>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {pastStream.peak_viewers || 0} peak
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {pastStream.ended_at && pastStream.started_at && (
                                  formatDistanceStrict(
                                    new Date(pastStream.ended_at),
                                    new Date(pastStream.started_at)
                                  )
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {pastStream.ended_at && format(new Date(pastStream.ended_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
