import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  Plus, 
  X, 
  Check, 
  Trash2,
  Clock,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useStreamPolls, StreamPoll } from '@/hooks/useStreamPolls';
import { cn } from '@/lib/utils';

interface StreamPollsProps {
  streamId: string | null;
  isStreaming: boolean;
  isOwner?: boolean;
}

export function StreamPolls({ streamId, isStreaming, isOwner = true }: StreamPollsProps) {
  const {
    polls,
    activePoll,
    loading,
    createPoll,
    vote,
    endPoll,
    deletePoll,
    getVoteCounts,
    hasUserVoted,
  } = useStreamPolls({ streamId });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState<number | undefined>(undefined);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;

    await createPoll(
      question.trim(),
      options.filter(o => o.trim()),
      duration
    );

    setQuestion('');
    setOptions(['', '']);
    setDuration(undefined);
    setIsCreateOpen(false);
  };

  const renderPollCard = (poll: StreamPoll, isActive: boolean) => {
    const { counts, total } = getVoteCounts(poll);
    const userVoted = hasUserVoted(poll);

    return (
      <Card key={poll.id} className={cn(
        'relative',
        isActive && 'border-primary'
      )}>
        {isActive && (
          <Badge className="absolute -top-2 -right-2 bg-primary">
            Active
          </Badge>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{poll.question}</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{total} votes</span>
            {poll.ends_at && (
              <>
                <Clock className="w-3 h-3 ml-2" />
                <span>Ends at {new Date(poll.ends_at).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {poll.options.map((option) => {
            const count = counts[option.id] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <button
                key={option.id}
                onClick={() => isActive && !userVoted && vote(poll.id, option.id)}
                disabled={!isActive || userVoted}
                className={cn(
                  'w-full text-left p-2 rounded-lg border transition-colors',
                  isActive && !userVoted && 'hover:border-primary cursor-pointer',
                  !isActive || userVoted ? 'cursor-default' : ''
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{option.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </button>
            );
          })}

          {isOwner && (
            <div className="flex gap-2 pt-2">
              {isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => endPoll(poll.id)}
                  className="flex-1"
                >
                  <Check className="w-3 h-3 mr-1" />
                  End Poll
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deletePoll(poll.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!streamId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Create a stream to use polls</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Polls
          </CardTitle>
          {isOwner && isStreaming && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Poll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Input
                      placeholder="Ask your audience..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Options</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                        />
                        {options.length > 2 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveOption(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {options.length < 6 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddOption}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (optional)</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={duration === 1 ? 'default' : 'outline'}
                        onClick={() => setDuration(1)}
                      >
                        1 min
                      </Button>
                      <Button
                        size="sm"
                        variant={duration === 5 ? 'default' : 'outline'}
                        onClick={() => setDuration(5)}
                      >
                        5 min
                      </Button>
                      <Button
                        size="sm"
                        variant={duration === 10 ? 'default' : 'outline'}
                        onClick={() => setDuration(10)}
                      >
                        10 min
                      </Button>
                      <Button
                        size="sm"
                        variant={!duration ? 'default' : 'outline'}
                        onClick={() => setDuration(undefined)}
                      >
                        No limit
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleCreatePoll}
                    disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                    className="w-full"
                  >
                    Create Poll
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No polls yet</p>
              {isOwner && isStreaming && (
                <p className="text-xs mt-1">Create a poll to engage your audience</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activePoll && renderPollCard(activePoll, true)}
              {polls
                .filter(p => p.id !== activePoll?.id)
                .map(poll => renderPollCard(poll, false))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
