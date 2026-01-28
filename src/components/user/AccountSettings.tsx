import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Phone, Lock, Loader2, Save, AlertTriangle } from "lucide-react";
import { z } from "zod";

interface AccountSettingsProps {
  userEmail: string;
  phone: string | null;
  onPhoneUpdate: (phone: string) => void;
}

const phoneSchema = z.string()
  .regex(/^[\d\s\+\-\(\)]*$/, "Format de téléphone invalide")
  .max(20, "Le téléphone ne peut pas dépasser 20 caractères");

const emailSchema = z.string()
  .email("Adresse email invalide")
  .max(255, "L'email ne peut pas dépasser 255 caractères");

export const AccountSettings = ({ userEmail, phone, onPhoneUpdate }: AccountSettingsProps) => {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [newPhone, setNewPhone] = useState(phone || "");
  const [newEmail, setNewEmail] = useState(userEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Update phone number
  const handlePhoneUpdate = async () => {
    const result = phoneSchema.safeParse(newPhone);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoadingPhone(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase
        .from("profiles")
        .update({ phone: newPhone, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;

      onPhoneUpdate(newPhone);
      setIsEditingPhone(false);
      toast.success("Numéro de téléphone mis à jour !");
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setLoadingPhone(false);
    }
  };

  // Update email
  const handleEmailUpdate = async () => {
    const result = emailSchema.safeParse(newEmail);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (newEmail === userEmail) {
      toast.error("L'email est identique à l'actuel");
      return;
    }

    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      toast.success("Un email de confirmation a été envoyé à votre nouvelle adresse. Veuillez cliquer sur le lien pour confirmer le changement.");
      setIsEditingEmail(false);
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setLoadingEmail(false);
    }
  };

  // Change password
  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast.success("Mot de passe modifié avec succès !");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Paramètres du Compte
          </CardTitle>
          <CardDescription>
            Gérez vos informations de connexion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditingEmail(true)}>
              Modifier
            </Button>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Téléphone</p>
                <p className="text-sm text-muted-foreground">{phone || "Non renseigné"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setNewPhone(phone || "");
              setIsEditingPhone(true);
            }}>
              Modifier
            </Button>
          </div>

          {/* Password */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Mot de passe</p>
                <p className="text-sm text-muted-foreground">••••••••</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
              Modifier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Phone Dialog */}
      <Dialog open={isEditingPhone} onOpenChange={setIsEditingPhone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le téléphone</DialogTitle>
            <DialogDescription>
              Entrez votre nouveau numéro de téléphone
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingPhone(false)}>
              Annuler
            </Button>
            <Button onClick={handlePhoneUpdate} disabled={loadingPhone}>
              {loadingPhone ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog open={isEditingEmail} onOpenChange={setIsEditingEmail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'email</DialogTitle>
            <DialogDescription>
              Un email de confirmation sera envoyé à votre nouvelle adresse
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg text-sm">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-foreground/80">
                Après confirmation, vous devrez vous reconnecter avec votre nouvelle adresse email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Nouvel email</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouveau@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingEmail(false)}>
              Annuler
            </Button>
            <Button onClick={handleEmailUpdate} disabled={loadingEmail}>
              {loadingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Envoyer la confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe sécurisé
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
              Annuler
            </Button>
            <Button onClick={handlePasswordChange} disabled={loadingPassword}>
              {loadingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Changer le mot de passe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountSettings;
