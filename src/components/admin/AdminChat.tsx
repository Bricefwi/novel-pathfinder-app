import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Send, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  activity_type: string;
  created_at: string;
  profile?: { first_name: string | null; last_name: string | null } | null;
}

const CHAT_ROOMS = [
  { id: "randonnee", name: "Randonnée" },
  { id: "cours", name: "Cours" },
  { id: "stage", name: "Stages" },
  { id: "sejour", name: "Séjours" },
  { id: "general", name: "Général" },
];

export function AdminChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.id || null);
    });
  }, []);

  const fetchMessages = async (room: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("activity_type", room)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setMessages([]);
    } else {
      // Fetch profiles separately
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      setMessages((data || []).map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || null
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMessages(activeRoom);

    const channel = supabase
      .channel(`admin-chat-${activeRoom}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `activity_type=eq.${activeRoom}` },
        () => fetchMessages(activeRoom)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const { error } = await supabase.from("chat_messages").insert({
      user_id: currentUser,
      content: newMessage.trim(),
      activity_type: activeRoom,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message supprimé" });
      fetchMessages(activeRoom);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Modération du chat</h2>

      <Tabs value={activeRoom} onValueChange={setActiveRoom}>
        <TabsList className="flex flex-wrap">
          {CHAT_ROOMS.map((room) => (
            <TabsTrigger key={room.id} value={room.id}>
              {room.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {CHAT_ROOMS.map((room) => (
          <TabsContent key={room.id} value={room.id}>
            <Card>
              <CardHeader>
                <CardTitle>Salon {room.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-y-auto space-y-3 mb-4 p-4 bg-muted/30 rounded-lg">
                  {isLoading ? (
                    <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-muted-foreground">Aucun message</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="flex items-start justify-between gap-2 p-3 bg-background rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {msg.profile?.first_name || "Utilisateur"} {msg.profile?.last_name || ""}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleString("fr-FR")}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{msg.content}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(msg.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    placeholder="Écrire en tant qu'admin..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button type="submit">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
