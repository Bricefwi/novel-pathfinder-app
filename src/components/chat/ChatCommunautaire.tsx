import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageCircle, Users, Mountain, GraduationCap, Calendar, Compass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schema for chat messages
const messageSchema = z.string()
  .trim()
  .min(1, "Le message ne peut pas être vide")
  .max(500, "Le message ne peut pas dépasser 500 caractères");

type ActivityType = 'randonnee' | 'cours' | 'stage' | 'sejour' | 'general';

interface ChatMessage {
  id: string;
  user_id: string;
  activity_type: string;
  content: string;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
}

const activityChannels: { value: ActivityType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'general', label: 'Général', icon: MessageCircle },
  { value: 'randonnee', label: 'Randonnées', icon: Mountain },
  { value: 'cours', label: 'Cours', icon: GraduationCap },
  { value: 'stage', label: 'Stages', icon: Calendar },
  { value: 'sejour', label: 'Séjours', icon: Compass },
];

const ChatCommunautaire = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState<ActivityType>('general');
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Fetch messages for active channel
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('activity_type', activeChannel)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
        // Fetch profiles for all unique user_ids
        const userIds = [...new Set(data?.map(m => m.user_id) || [])];
        fetchProfiles(userIds);
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${activeChannel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `activity_type=eq.${activeChannel}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
          fetchProfiles([newMsg.user_id]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `activity_type=eq.${activeChannel}`
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);

  // Fetch user profiles
  const fetchProfiles = async (userIds: string[]) => {
    const missingIds = userIds.filter(id => !profiles[id]);
    if (missingIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', missingIds);

    if (data) {
      const newProfiles: Record<string, Profile> = {};
      data.forEach(p => {
        newProfiles[p.user_id] = { first_name: p.first_name, last_name: p.last_name };
      });
      setProfiles(prev => ({ ...prev, ...newProfiles }));
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // Validate message content
    const result = messageSchema.safeParse(newMessage);
    if (!result.success) {
      toast({
        title: "Erreur",
        description: result.error.errors[0]?.message || "Message invalide",
        variant: "destructive"
      });
      return;
    }

    const sanitizedContent = result.data;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        activity_type: activeChannel,
        content: sanitizedContent
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    } else {
      setNewMessage("");
    }
  };

  const getInitials = (userId: string) => {
    const profile = profiles[userId];
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return "?";
  };

  const getDisplayName = (id: string) => {
    const profile = profiles[id];
    if (profile?.first_name) {
      return `${profile.first_name} ${profile.last_name?.[0] || ''}.`;
    }
    return "Membre";
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  if (!userId) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Connectez-vous pour accéder au chat communautaire
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Chat Communautaire
          </CardTitle>
        </div>
        <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ActivityType)} className="mt-2">
          <TabsList className="grid grid-cols-5 w-full">
            {activityChannels.map(channel => (
              <TabsTrigger key={channel.value} value={channel.value} className="text-xs gap-1">
                <channel.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{channel.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Aucun message dans ce canal.
                <br />
                Soyez le premier à écrire !
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground px-2">{date}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-3">
                    {msgs.map((message) => {
                      const isOwn = message.user_id === userId;
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                              {getInitials(message.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${isOwn ? 'text-primary' : 'text-foreground'}`}>
                                {isOwn ? 'Vous' : getDisplayName(message.user_id)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.created_at)}
                              </span>
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2 inline-block ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted text-foreground rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={sendMessage} className="p-4 border-t border-border flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1"
            maxLength={500}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChatCommunautaire;