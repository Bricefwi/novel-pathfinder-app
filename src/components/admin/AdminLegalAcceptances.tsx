import { useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Shield, 
  Eye, 
  Download, 
  FileCheck, 
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Calendar,
  Hash,
  Filter
} from "lucide-react";

interface LegalAcceptance {
  id: string;
  user_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  activity_id: string | null;
  client_email: string;
  client_name: string;
  client_ip: string | null;
  user_agent: string | null;
  cgu_version: string;
  cgv_version: string;
  cgu_url: string | null;
  cgv_url: string | null;
  cgu_document_hash: string | null;
  cgv_document_hash: string | null;
  cgu_accepted: boolean;
  cgu_accepted_at: string | null;
  cgv_accepted: boolean;
  cgv_accepted_at: string | null;
  signature_data: string | null;
  signature_type: string | null;
  acceptance_context: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

const contextLabels: Record<string, string> = {
  quote_validation: "Validation devis",
  invoice_payment: "Paiement facture",
  booking_confirmation: "Confirmation réservation",
};

const signatureTypeLabels: Record<string, string> = {
  electronic: "Électronique",
  manual: "Manuscrite",
  checkbox: "Case à cocher",
};

export const AdminLegalAcceptances = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterContext, setFilterContext] = useState<string>("all");
  const [selectedAcceptance, setSelectedAcceptance] = useState<LegalAcceptance | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch acceptances
  const { data: acceptances, isLoading } = useQuery({
    queryKey: ["admin-legal-acceptances", filterContext],
    queryFn: async () => {
      let query = supabase
        .from("legal_acceptances")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (filterContext !== "all") {
        query = query.eq("acceptance_context", filterContext);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LegalAcceptance[];
    },
  });

  // Update acceptance mutation
  const updateAcceptanceMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<LegalAcceptance> }) => {
      const { error } = await supabase
        .from("legal_acceptances")
        .update(data.updates)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-legal-acceptances"] });
      toast.success("Acceptation mise à jour");
      setEditDialogOpen(false);
      setSelectedAcceptance(null);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // Filter acceptances by search term
  const filteredAcceptances = acceptances?.filter(acceptance => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      acceptance.client_name.toLowerCase().includes(search) ||
      acceptance.client_email.toLowerCase().includes(search) ||
      acceptance.cgu_version.includes(search) ||
      acceptance.cgv_version.includes(search)
    );
  });

  const handleExportCSV = () => {
    if (!filteredAcceptances?.length) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = [
      "ID",
      "Client",
      "Email",
      "CGU Version",
      "CGU Acceptée",
      "CGU Date",
      "CGV Version",
      "CGV Acceptée",
      "CGV Date",
      "Contexte",
      "Type Signature",
      "Créé le"
    ];

    const rows = filteredAcceptances.map(a => [
      a.id,
      a.client_name,
      a.client_email,
      a.cgu_version,
      a.cgu_accepted ? "Oui" : "Non",
      a.cgu_accepted_at ? format(new Date(a.cgu_accepted_at), "dd/MM/yyyy HH:mm") : "",
      a.cgv_version,
      a.cgv_accepted ? "Oui" : "Non",
      a.cgv_accepted_at ? format(new Date(a.cgv_accepted_at), "dd/MM/yyyy HH:mm") : "",
      a.acceptance_context ? contextLabels[a.acceptance_context] || a.acceptance_context : "",
      a.signature_type ? signatureTypeLabels[a.signature_type] || a.signature_type : "",
      format(new Date(a.created_at), "dd/MM/yyyy HH:mm")
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `acceptations-legales-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const EditForm = () => {
    const [formData, setFormData] = useState({
      cgu_version: selectedAcceptance?.cgu_version || "1.0",
      cgv_version: selectedAcceptance?.cgv_version || "1.0",
      cgu_url: selectedAcceptance?.cgu_url || "",
      cgv_url: selectedAcceptance?.cgv_url || "",
      acceptance_context: selectedAcceptance?.acceptance_context || "",
      signature_type: selectedAcceptance?.signature_type || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedAcceptance) return;
      
      updateAcceptanceMutation.mutate({
        id: selectedAcceptance.id,
        updates: {
          cgu_version: formData.cgu_version,
          cgv_version: formData.cgv_version,
          cgu_url: formData.cgu_url || null,
          cgv_url: formData.cgv_url || null,
          acceptance_context: formData.acceptance_context || null,
          signature_type: formData.signature_type || null,
        },
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Version CGU</Label>
            <Input
              value={formData.cgu_version}
              onChange={e => setFormData(prev => ({ ...prev, cgu_version: e.target.value }))}
              placeholder="1.0"
            />
          </div>
          <div className="space-y-2">
            <Label>Version CGV</Label>
            <Input
              value={formData.cgv_version}
              onChange={e => setFormData(prev => ({ ...prev, cgv_version: e.target.value }))}
              placeholder="1.0"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>URL Document CGU</Label>
          <Input
            value={formData.cgu_url}
            onChange={e => setFormData(prev => ({ ...prev, cgu_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        
        <div className="space-y-2">
          <Label>URL Document CGV</Label>
          <Input
            value={formData.cgv_url}
            onChange={e => setFormData(prev => ({ ...prev, cgv_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Contexte</Label>
            <Select 
              value={formData.acceptance_context}
              onValueChange={v => setFormData(prev => ({ ...prev, acceptance_context: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quote_validation">Validation devis</SelectItem>
                <SelectItem value="invoice_payment">Paiement facture</SelectItem>
                <SelectItem value="booking_confirmation">Confirmation réservation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type de signature</Label>
            <Select
              value={formData.signature_type}
              onValueChange={v => setFormData(prev => ({ ...prev, signature_type: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronic">Électronique</SelectItem>
                <SelectItem value="checkbox">Case à cocher</SelectItem>
                <SelectItem value="manual">Manuscrite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={updateAcceptanceMutation.isPending}>
          {updateAcceptanceMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Acceptations Légales
              </CardTitle>
              <CardDescription>
                Traçabilité des acceptations CGU/CGV avec preuves juridiques
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, version..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterContext} onValueChange={setFilterContext}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par contexte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les contextes</SelectItem>
                <SelectItem value="quote_validation">Validation devis</SelectItem>
                <SelectItem value="invoice_payment">Paiement facture</SelectItem>
                <SelectItem value="booking_confirmation">Confirmation réservation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <FileCheck className="h-4 w-4" />
                Total
              </div>
              <p className="text-2xl font-bold">{acceptances?.length || 0}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                CGU Acceptées
              </div>
              <p className="text-2xl font-bold text-green-600">
                {acceptances?.filter(a => a.cgu_accepted).length || 0}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                CGV Acceptées
              </div>
              <p className="text-2xl font-bold text-green-600">
                {acceptances?.filter(a => a.cgv_accepted).length || 0}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Clock className="h-4 w-4 text-yellow-600" />
                En attente
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {acceptances?.filter(a => !a.cgu_accepted || !a.cgv_accepted).length || 0}
              </p>
            </Card>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredAcceptances && filteredAcceptances.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>CGU</TableHead>
                    <TableHead>CGV</TableHead>
                    <TableHead>Contexte</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcceptances.map((acceptance) => (
                    <TableRow key={acceptance.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{acceptance.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {acceptance.client_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {acceptance.cgu_accepted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">v{acceptance.cgu_version}</span>
                        </div>
                        {acceptance.cgu_accepted_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(acceptance.cgu_accepted_at), "dd/MM/yy HH:mm", { locale: fr })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {acceptance.cgv_accepted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">v{acceptance.cgv_version}</span>
                        </div>
                        {acceptance.cgv_accepted_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(acceptance.cgv_accepted_at), "dd/MM/yy HH:mm", { locale: fr })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {acceptance.acceptance_context && (
                          <Badge variant="outline" className="text-xs">
                            {contextLabels[acceptance.acceptance_context] || acceptance.acceptance_context}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(acceptance.created_at), "dd/MM/yyyy", { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* View Details */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Détails de l'acceptation</DialogTitle>
                                <DialogDescription>
                                  {acceptance.client_name} - {acceptance.client_email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <Label className="text-muted-foreground">ID Utilisateur</Label>
                                    <p className="text-sm font-mono">{acceptance.user_id || "Non lié"}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-muted-foreground">ID Devis</Label>
                                    <p className="text-sm font-mono">{acceptance.quote_id || "—"}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-muted-foreground">ID Facture</Label>
                                    <p className="text-sm font-mono">{acceptance.invoice_id || "—"}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-muted-foreground">ID Activité</Label>
                                    <p className="text-sm font-mono">{acceptance.activity_id || "—"}</p>
                                  </div>
                                </div>
                                
                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-2">Informations techniques</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <Label className="text-muted-foreground">Adresse IP</Label>
                                      <p className="font-mono">{acceptance.client_ip || "Non enregistrée"}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Type de signature</Label>
                                      <p>{acceptance.signature_type ? signatureTypeLabels[acceptance.signature_type] || acceptance.signature_type : "—"}</p>
                                    </div>
                                  </div>
                                  {acceptance.user_agent && (
                                    <div className="mt-2">
                                      <Label className="text-muted-foreground">User Agent</Label>
                                      <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">
                                        {acceptance.user_agent}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                {(acceptance.cgu_document_hash || acceptance.cgv_document_hash) && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <Hash className="h-4 w-4" />
                                      Hash des documents (preuve d'intégrité)
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      {acceptance.cgu_document_hash && (
                                        <div>
                                          <Label className="text-muted-foreground">Hash CGU</Label>
                                          <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                                            {acceptance.cgu_document_hash}
                                          </p>
                                        </div>
                                      )}
                                      {acceptance.cgv_document_hash && (
                                        <div>
                                          <Label className="text-muted-foreground">Hash CGV</Label>
                                          <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                                            {acceptance.cgv_document_hash}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {acceptance.signature_data && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-medium mb-2">Signature électronique</h4>
                                    <div className="bg-muted p-4 rounded flex items-center justify-center">
                                      <img 
                                        src={acceptance.signature_data} 
                                        alt="Signature" 
                                        className="max-h-20"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {/* Edit */}
                          <Dialog open={editDialogOpen && selectedAcceptance?.id === acceptance.id} onOpenChange={(open) => {
                            setEditDialogOpen(open);
                            if (open) setSelectedAcceptance(acceptance);
                            else setSelectedAcceptance(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedAcceptance(acceptance)}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier l'acceptation</DialogTitle>
                                <DialogDescription>
                                  Mettre à jour les versions et métadonnées
                                </DialogDescription>
                              </DialogHeader>
                              <EditForm />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune acceptation enregistrée</p>
              <p className="text-sm mt-2">
                Les acceptations CGU/CGV apparaîtront ici lorsque les clients valideront leurs devis ou factures.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
