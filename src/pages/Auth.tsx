import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import cavaliersSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) {
      toast.error("Erreur lors de l'envoi : " + error.message);
    } else {
      toast.success("Email de confirmation renvoyé ! Vérifiez votre boîte de réception.");
    }
    setResendLoading(false);
  };

  useEffect(() => {
    checkSessionAndRedirect();
  }, []);

  const checkSessionAndRedirect = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await handlePostLoginRedirect(session.user.id);
    }
  };

  const handlePostLoginRedirect = async (userId: string) => {
    // Check if onboarding is completed
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single();

    if (profile?.onboarding_completed) {
      navigate("/mon-espace");
    } else {
      navigate("/onboarding");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
        toast.error(
          "Connexion Google indisponible pour l’instant : activez Google dans le backend (Users → Auth Settings → Google Settings), ou créez un compte par email."
        );
      } else {
        toast.error("Erreur de connexion Google : " + error.message);
      }
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou mot de passe incorrect");
          setShowResendButton(false);
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Veuillez confirmer votre email avant de vous connecter");
          setShowResendButton(true);
        } else {
          toast.error(error.message);
          setShowResendButton(false);
        }
      } else if (data.user) {
        setShowResendButton(false);
        toast.success("Connexion réussie !");
        await handlePostLoginRedirect(data.user.id);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { first_name: firstName, last_name: lastName },
        },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Cet email est déjà utilisé. Essayez de vous connecter.");
        } else {
          toast.error(error.message);
        }
      } else if (data.user) {
        // Auto-confirm is enabled, so redirect directly
        if (data.session) {
          toast.success("Inscription réussie ! Bienvenue chez An Arwen 🐴");
          await handlePostLoginRedirect(data.user.id);
        } else {
          toast.success("Inscription réussie ! Vérifiez votre email pour confirmer.");
        }
      }
    }
    setLoading(false);
  };

  return (
    <Layout>
      <section className="min-h-screen flex">
        {/* Left Column - Image (Desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <img
            src={cavaliersSoleil}
            alt="Cavaliers au coucher du soleil"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/20" />
          <div className="relative z-10 flex flex-col justify-end p-12 text-foreground">
            <blockquote className="space-y-4">
              <p className="text-2xl font-serif italic leading-relaxed">
                "Le paradis terrestre se trouve sur le dos d'un cheval, dans les pages d'un livre et dans le sourire d'une femme."
              </p>
              <footer className="text-sm text-muted-foreground">— Proverbe arabe</footer>
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-1 w-12 bg-primary rounded" />
              <span className="text-sm font-medium">Ferme Équestre An Arwen</span>
            </div>
          </div>
        </div>

        {/* Right Column - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="font-serif text-3xl font-bold">
                {isLogin ? "Bon retour parmi nous !" : "Rejoignez l'aventure"}
              </h1>
              <p className="text-muted-foreground">
                {isLogin
                  ? "Connectez-vous pour accéder à votre espace cavalier"
                  : "Créez votre compte et préparez votre prochaine escapade équestre"}
              </p>
            </div>

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base gap-3 border-2 hover:bg-muted/50"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continuer avec Google
            </Button>

            {/* Separator */}
            <div className="relative">
              <Separator className="my-4" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-sm text-muted-foreground">
                ou par email
              </span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dupont"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                )}
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isLogin ? (
                  "Se connecter"
                ) : (
                  "Créer mon compte"
                )}
              </Button>

              {/* Resend confirmation email button */}
              {isLogin && showResendButton && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-sm gap-2 border-primary/50 text-primary hover:bg-primary/10"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Renvoyer l'email de confirmation
                </Button>
              )}
            </form>

            {/* Toggle Login/Signup */}
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-primary hover:underline"
              >
                {isLogin ? "S'inscrire gratuitement" : "Se connecter"}
              </button>
            </p>

            {/* Legal Notice */}
            <p className="text-center text-xs text-muted-foreground">
              En vous inscrivant, vous acceptez nos{" "}
              <a href="/cgu" className="underline hover:text-foreground">CGU</a> et notre{" "}
              <a href="/politique-confidentialite" className="underline hover:text-foreground">
                politique de confidentialité
              </a>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Auth;
