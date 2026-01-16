import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Bot, User, Loader2, ArrowLeft } from "lucide-react";
import avatarLoic from "@/assets/avatar-loic.jpg";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type UserRole = "visitor" | "user" | "admin";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-loic`;

const getWelcomeMessage = (role: UserRole, firstName?: string): string => {
  const name = firstName ? ` ${firstName}` : "";
  
  switch (role) {
    case "admin":
      return `Demat${name} ! 🐴 Je suis Loïc, ton assistant technique breton. Que ce soit pour gérer les stocks, analyser les stats ou naviguer dans la Control Tower, je suis là pour t'aider. Un petit kouign-amann avec ça ?`;
    case "user":
      return `Demat${name} ! 🐴 Je suis Loïc, ton guide breton pour préparer ta prochaine aventure équestre. Questions sur les destinations, les réservations ou la préparation du voyage ? Je connais le terrain comme ma poche (et je connais aussi les meilleurs spots pour une crêpe complète) !`;
    default:
      return `Demat ! 🐴 Je suis Loïc, guide breton et passionné de chevaux. Bienvenue chez An Arwen ! Vous rêvez de galoper sur les plages bretonnes ou dans le désert marocain ? Posez-moi vos questions, je serai ravi de vous faire découvrir nos aventures équestres !`;
  }
};

export default function AgentFAQ() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("visitor");
  const [userName, setUserName] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    // Add welcome message when role is determined (only once)
    if (!isInitialized) {
      setMessages([{ role: "assistant", content: getWelcomeMessage(userRole, userName) }]);
      setIsInitialized(true);
    }
  }, [userRole, userName, isInitialized]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setUserRole("visitor");
      return;
    }

    // Get profile for first name
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("user_id", user.id)
      .single();

    if (profile?.first_name) {
      setUserName(profile.first_name);
    }

    // Check if admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role === "admin") {
      setUserRole("admin");
    } else {
      setUserRole("user");
    }
  };

  const sendChat = async (userMessage: string) => {
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        question: userMessage,
        userRole,
        userName,
        conversationHistory
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || "Erreur de connexion avec Loïc");
    }

    // Gestion de la réponse JSON standard (non-streaming)
    const assistantContent = data.response || data.choices?.[0]?.message?.content || "Demat ! Je n'ai pas pu formuler une réponse.";
    
    setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      await sendChat(userMessage);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Loïc a un petit souci...");
      // Remove the user message if error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-32 pb-8">
        <div className="container max-w-3xl mx-auto px-4">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-6 bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary shrink-0">
                <AvatarImage src={avatarLoic} alt="Loïc" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">Loïc</h1>
                <p className="text-sm text-muted-foreground">Guide breton virtuel • En ligne</p>
              </div>
            </div>
          </div>

          {/* Chat Container */}
          <Card className="border-2 overflow-hidden">
            <ScrollArea className="h-[60vh] p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <Avatar className={`h-8 w-8 shrink-0 ${message.role === "user" ? "bg-primary" : "bg-muted"}`}>
                      {message.role === "assistant" ? (
                        <>
                          <AvatarImage src={avatarLoic} alt="Loïc" />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : "bg-muted rounded-tl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={avatarLoic} alt="Loïc" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">Loïc écrit</span>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t bg-background p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Posez votre question à Loïc..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Loïc connaît An Arwen par cœur • Réponses personnalisées selon votre profil
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
