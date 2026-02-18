import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Inbox,
  MessageSquare,
  FileText,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Archive,
  ArchiveRestore,
  Send,
  User,
  Calendar,
  Star,
  Loader2,
} from "lucide-react";

interface InboxItem {
  id: string;
  type: "contact" | "chat";
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  created_at: string;
  is_read?: boolean;
  is_archived?: boolean;
  is_important?: boolean;
}

export function UnifiedInbox({ onNavigateToQuotes }: { onNavigateToQuotes?: (prefill: { client_name: string; client_email: string; client_phone?: string; subject?: string; message?: string }) => void }) {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "contacts" | "chat" | "archived" | "important">("all");
  const [sendingReply, setSendingReply] = useState(false);

  // Fetch all messages including archived
  const { data: inboxItems, isLoading } = useQuery({
    queryKey: ["unified-inbox"],
    queryFn: async () => {
      const [contactsRes, archivedContactsRes, chatRes] = await Promise.all([
        supabase
          .from("contact_requests")
          .select("*")
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("contact_requests")
          .select("*")
          .eq("is_archived", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("chat_messages")
          .select("*, profiles:user_id(first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const contacts: InboxItem[] = (contactsRes.data || []).map((c) => ({
        id: c.id,
        type: "contact" as const,
        name: c.name,
        email: c.email,
        phone: c.phone,
        subject: c.subject,
        message: c.message,
        created_at: c.created_at,
        is_read: c.is_read,
        is_archived: c.is_archived,
        is_important: false, // Will be stored in metadata or separate column later
      }));

      const archivedContacts: InboxItem[] = (archivedContactsRes.data || []).map((c) => ({
        id: c.id,
        type: "contact" as const,
        name: c.name,
        email: c.email,
        phone: c.phone,
        subject: c.subject,
        message: c.message,
        created_at: c.created_at,
        is_read: c.is_read,
        is_archived: c.is_archived,
        is_important: false,
      }));

      const chats: InboxItem[] = (chatRes.data || []).map((m) => ({
        id: m.id,
        type: "chat" as const,
        name: `${(m as any).profiles?.first_name || "Utilisateur"} ${(m as any).profiles?.last_name || ""}`.trim(),
        email: "",
        message: m.content,
        created_at: m.created_at,
      }));

      return {
        active: [...contacts, ...chats].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        archived: archivedContacts,
      };
    },
  });

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_requests")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    },
  });

  // Archive
  const archiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_requests")
        .update({ is_archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
      toast.success("Message archivé");
      setSelectedItem(null);
    },
  });

  // Unarchive
  const unarchiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_requests")
        .update({ is_archived: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
      toast.success("Message restauré");
      setSelectedItem(null);
    },
  });

  // Send reply email
  const handleSendReply = async () => {
    if (!selectedItem || !replyMessage.trim() || !selectedItem.email) {
      toast.error("Impossible d'envoyer la réponse");
      return;
    }

    if (sendingReply) return; // Double-click guard

    setSendingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-reply", {
        body: {
          to: selectedItem.email,
          subject: `Re: ${selectedItem.subject || "Votre demande"}`,
          message: replyMessage,
          originalMessage: selectedItem.message,
          senderName: selectedItem.name,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Réponse envoyée à ${selectedItem.email}`);
      setReplyMessage("");
      
      // Mark as read
      await supabase
        .from("contact_requests")
        .update({ is_read: true })
        .eq("id", selectedItem.id);
      
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    } catch (err: any) {
      console.error("Error sending reply:", err);
      const detail = err?.message || "Erreur inconnue";
      toast.error(`Erreur lors de l'envoi : ${detail}`);
    } finally {
      setSendingReply(false);
    }
  };

  // Get filtered items based on active tab
  const getFilteredItems = () => {
    if (activeTab === "archived") {
      return inboxItems?.archived || [];
    }
    const items = inboxItems?.active || [];
    if (activeTab === "contacts") return items.filter((i) => i.type === "contact");
    if (activeTab === "chat") return items.filter((i) => i.type === "chat");
    if (activeTab === "important") return items.filter((i) => i.is_important);
    return items;
  };

  const filteredItems = getFilteredItems();

  const unreadCount = (inboxItems?.active || []).filter(
    (item) => item.type === "contact" && !item.is_read
  ).length;

  const handleSelectItem = (item: InboxItem) => {
    setSelectedItem(item);
    setReplyMessage("");
    if (item.type === "contact" && !item.is_read) {
      markAsRead.mutate(item.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <Inbox className="h-6 w-6 text-primary" />
          Inbox Unifiée
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tous vos messages au même endroit : demandes de contact et chat
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Inbox className="h-4 w-4" />
            Tous
            <Badge variant="secondary">{inboxItems?.active?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Mail className="h-4 w-4" />
            Contacts
            <Badge variant="secondary">
              {inboxItems?.active?.filter((i) => i.type === "contact").length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
            <Badge variant="secondary">
              {inboxItems?.active?.filter((i) => i.type === "chat").length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archivés
            <Badge variant="secondary">{inboxItems?.archived?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Message List */}
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <ScrollArea className="h-[550px]">
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                      selectedItem?.id === item.id ? "bg-muted" : ""
                    } ${item.type === "contact" && !item.is_read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          item.type === "contact" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                        }`}
                      >
                        {item.type === "contact" ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-medium truncate ${!item.is_read && item.type === "contact" ? "font-semibold" : ""}`}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1">
                            {item.is_important && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                            {item.type === "contact" && !item.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                        {item.subject && (
                          <p className="text-sm text-muted-foreground truncate">{item.subject}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-1">{item.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(item.created_at), "dd MMM HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {activeTab === "archived" ? "Aucun message archivé" : "Aucun message"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-2">
          {selectedItem ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedItem.type === "contact" ? (
                        <Mail className="h-5 w-5 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      )}
                      {selectedItem.name}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-4">
                      {selectedItem.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedItem.email}
                        </span>
                      )}
                      {selectedItem.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedItem.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(selectedItem.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </span>
                    </CardDescription>
                  </div>
                  {selectedItem.type === "contact" && (
                    <div className="flex gap-2">
                      {selectedItem.is_archived ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unarchiveItem.mutate(selectedItem.id)}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-1" />
                          Restaurer
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => archiveItem.mutate(selectedItem.id)}
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          Archiver
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {selectedItem.subject && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Objet :</span>
                    <p className="font-medium">{selectedItem.subject}</p>
                  </div>
                )}
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{selectedItem.message}</p>
                </div>

                {selectedItem.type === "contact" && selectedItem.email && !selectedItem.is_archived && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Répondre
                    </h4>
                    <Textarea
                      placeholder="Tapez votre réponse..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (onNavigateToQuotes && selectedItem) {
                            onNavigateToQuotes({
                              client_name: selectedItem.name,
                              client_email: selectedItem.email,
                              client_phone: selectedItem.phone || undefined,
                              subject: selectedItem.subject || undefined,
                              message: selectedItem.message,
                            });
                          } else {
                            toast.error("Navigation vers les devis non disponible");
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Générer Devis
                      </Button>
                      <Button 
                        disabled={!replyMessage.trim() || sendingReply}
                        onClick={handleSendReply}
                      >
                        {sendingReply ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {sendingReply ? "Envoi..." : "Envoyer par email"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[550px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un message pour le lire</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
