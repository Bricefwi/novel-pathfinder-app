import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, ShieldCheck, User, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UserRoleManagerProps {
  userId: string;
  userName: string;
  currentRole?: "admin" | "user";
  onRoleChanged?: () => void;
}

export function UserRoleManager({ userId, userName, currentRole = "user", onRoleChanged }: UserRoleManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "user">(currentRole);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: "admin" | "user") => {
      // First check if user already has a role entry
      const { data: existingRole, error: fetchError } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        
        if (error) throw error;
      }

      return newRole;
    },
    onSuccess: (newRole) => {
      toast.success(`Rôle de ${userName} mis à jour : ${newRole === "admin" ? "Administrateur" : "Utilisateur"}`);
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      setIsOpen(false);
      setShowConfirmation(false);
      setConfirmationText("");
      onRoleChanged?.();
    },
    onError: (error) => {
      console.error("Erreur mise à jour rôle:", error);
      toast.error("Erreur lors de la mise à jour du rôle");
    },
  });

  const handleSaveRole = () => {
    if (selectedRole !== currentRole) {
      // Show security confirmation for critical role changes
      setShowConfirmation(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleConfirmedRoleChange = () => {
    // Validate confirmation text
    const expectedText = selectedRole === "admin" ? "PROMOUVOIR" : "RÉVOQUER";
    if (confirmationText.toUpperCase() !== expectedText) {
      toast.error(`Veuillez taper "${expectedText}" pour confirmer`);
      return;
    }
    
    updateRoleMutation.mutate(selectedRole);
  };

  const getRoleBadge = (role: "admin" | "user") => {
    if (role === "admin") {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
          <ShieldCheck className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <User className="h-3 w-3" />
        Utilisateur
      </Badge>
    );
  };

  const getConfirmationDetails = () => {
    if (selectedRole === "admin") {
      return {
        title: "Promouvoir en Administrateur ?",
        description: `Vous êtes sur le point de donner les droits d'administrateur à ${userName}. Cette personne aura accès au Control Tower et pourra gérer tout le contenu du site, les utilisateurs et les données sensibles.`,
        confirmText: "PROMOUVOIR",
        actionLabel: "Confirmer la promotion",
        variant: "default" as const
      };
    }
    return {
      title: "Révoquer les droits Administrateur ?",
      description: `Vous êtes sur le point de retirer les droits d'administrateur à ${userName}. Cette personne n'aura plus accès au Control Tower ni aux fonctionnalités d'administration.`,
      confirmText: "RÉVOQUER",
      actionLabel: "Confirmer la révocation",
      variant: "destructive" as const
    };
  };

  const confirmDetails = getConfirmationDetails();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Shield className="h-4 w-4" />
        Gérer le rôle
      </Button>

      {/* Main Role Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Gestion des droits
            </DialogTitle>
            <DialogDescription>
              Modifier le rôle de <strong>{userName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-sm text-muted-foreground">Rôle actuel</p>
              </div>
              {getRoleBadge(currentRole)}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nouveau rôle</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "user")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Utilisateur
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Administrateur
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === "admin" 
                  ? "L'administrateur a accès au Control Tower et peut gérer le contenu du site."
                  : "L'utilisateur peut accéder à son espace client et réserver des activités."
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveRole}
              disabled={selectedRole === currentRole}
            >
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {confirmDetails.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>{confirmDetails.description}</p>
              
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Action de sécurité requise
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  Pour confirmer, tapez <strong>"{confirmDetails.confirmText}"</strong> ci-dessous :
                </p>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={confirmDetails.confirmText}
                  className="border-amber-300 dark:border-amber-700"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmationText("");
              setShowConfirmation(false);
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedRoleChange}
              disabled={confirmationText.toUpperCase() !== confirmDetails.confirmText || updateRoleMutation.isPending}
              className={selectedRole === "user" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                confirmDetails.actionLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
