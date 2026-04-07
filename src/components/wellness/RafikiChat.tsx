import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, Phone, Shield, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  crisisDetected?: boolean;
  crisisResources?: { name: string; phone: string; available: string }[];
}

const CRISIS_RESOURCES = [
  { name: 'Befrienders Kenya', phone: '0800 723 253', available: '24/7, free' },
  { name: 'Kenya Red Cross Psychosocial', phone: '+254 703 037 000', available: '24/7' },
  { name: 'AMREF Health Africa', phone: '0800 720 021', available: '24/7, free' },
];

export function RafikiChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Habari! 👋 I'm Rafiki, your wellness companion. I'm here to listen, support, and help you navigate the pressures of running a business. What's on your mind today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('wellness-ai-chat', {
        body: { chatMessage: userMsg, history },
      });

      if (error) throw error;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data?.response || "I'm here with you. Let's take it one step at a time. 💛",
          crisisDetected: data?.crisisDetected,
          crisisResources: data?.crisisResources,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble connecting right now, but I'm still here for you. Try again in a moment. 💛" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            Rafiki AI — Your Wellness Friend
          </CardTitle>
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="w-3 h-3" /> Private
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          This conversation is private and supportive — not a substitute for professional care.
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.crisisDetected && msg.crisisResources && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
                      <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Crisis Support Lines
                      </p>
                      {msg.crisisResources.map(r => (
                        <a
                          key={r.phone}
                          href={`tel:${r.phone.replace(/\s/g, '')}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-background hover:bg-muted transition-colors text-xs"
                        >
                          <span className="font-medium">{r.name}</span>
                          <span className="text-primary font-mono">{r.phone}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Rafiki is reflecting...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Crisis resources always visible */}
        <div className="px-4 py-1.5 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Need help now? <a href="tel:0800723253" className="text-primary font-medium">Befrienders Kenya: 0800 723 253</a> (24/7, free)
          </p>
        </div>

        {/* Input */}
        <div className="p-3 border-t flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Zungumza na Rafiki... (Talk to Rafiki)"
            rows={1}
            maxLength={800}
            className="resize-none min-h-[40px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() || loading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
