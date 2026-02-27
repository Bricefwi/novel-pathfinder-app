import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Loader2, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import cavaliersSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const navigate = useNavigate();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || !otpEmail) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: otpEmail,
    });
    if (error) {
      toast.error("Erreur lors du renvoi : " + error.message);
    } else {
      toast.success("Nouveau code envoyé ! Vérifiez votre boîte email.");
      setOtpCountdown(60);
    }
    setResendLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Veuillez entrer le code à 6 chiffres");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'signup',
      });
      if (error) {
        toast.error("Code invalide ou expiré. Veuillez réessayer.");
      } else if (data.user) {
        toast.success("Email vérifié ! Bienvenue chez An Arwen 🐴");
        setIsOtpStep(false);
        await handlePostLoginRedirect(data.user.id);
      }
    } catch (err: any) {
      toast.error("Erreur de vérification : " + (err?.message || "Erreur inconnue"));
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) {
      toast.error("Erreur lors de l'envoi : " + error.message);
    } else {
      toast.success("Code de confirmation renvoyé ! Vérifiez votre boîte de réception.");
      setOtpEmail(email);
      setIsOtpStep(true);
      setOtpCountdown(60);
    }
    setResendLoading(false);
  };

  // Listener global pour capturer les événements d'authentification (notamment OAuth callback)
  useEffect(() => {
    // Détecter les paramètres de recovery/invite AVANT le listener
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const isRecoveryOrInvite =
      urlParams.get("reset") === "true" ||
      hashParams.get("type") === "recovery" ||
      hashParams.get("type") === "invite";

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Gérer explicitement l'événement PASSWORD_RECOVERY
      if (event === "PASSWORD_RECOVERY") {
        setIsResetPassword(true);
        setIsLogin(true);
        setIsForgotPassword(false);
        return; // Ne PAS rediriger
      }

      if (event === "SIGNED_IN" && session?.user) {
        // Si c'est un flux recovery/invite, bloquer la redirection
        if (isRecoveryOrInvite) {
          setIsResetPassword(true);
          setIsLogin(true);
          setIsForgotPassword(false);
          return; // Laisser le formulaire de mot de passe s'afficher
        }

        // Éviter les doubles redirections si déjà en cours de traitement
        if (loading || googleLoading) return;
        
        toast.success("Connexion réussie !");
        await handlePostLoginRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, loading, googleLoading]);

  useEffect(() => {
    checkSessionAndRedirect();
  }, []);

  const checkSessionAndRedirect = async () => {
    // Check for reset password flow
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    
    // Supabase sends access_token in hash for password reset and invitations
    if (params.get("reset") === "true" || hashParams.get("type") === "recovery" || hashParams.get("type") === "invite") {
      setIsResetPassword(true);
      setIsLogin(true);
      setIsForgotPassword(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // If we have a recovery or invite session, stay on reset page
      if (hashParams.get("type") === "recovery" || hashParams.get("type") === "invite") {
        setIsResetPassword(true);
        return;
      }
      await handlePostLoginRedirect(session.user.id);
    }
  };

  // Handle new password submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Mot de passe défini avec succès ! Bienvenue chez An Arwen 🐴");
      setIsResetPassword(false);
      setPassword("");
      setConfirmPassword("");
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      // L'utilisateur a déjà une session active, rediriger vers son espace
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handlePostLoginRedirect(session.user.id);
      } else {
        navigate("/auth");
      }
    }
    setLoading(false);
  };

  const handlePostLoginRedirect = async (userId: string) => {
    try {
      // 1. Vérification Admin via RPC sécurisé ou table user_roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      // Fallback: vérification par email admin connu
      const { data: { user } } = await supabase.auth.getUser();
      const isAdminEmail = user?.email === "ferme.equestre.arwen@gmail.com";

      if (roleData?.role === "admin" || isAdminEmail) {
        toast.success("Bienvenue, Administrateur !");
        navigate("/admin");
        return;
      }

      // 2. Pour les clients : vérifier l'onboarding
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();

      // Si pas de profil ou onboarding incomplet -> Onboarding
      if (error || !profile || !profile.onboarding_completed) {
        navigate("/onboarding");
      } else {
        // Sinon -> Espace Client
        navigate("/mon-espace");
      }
    } catch (err) {
      console.error("Redirect error:", err);
      // Fallback de sécurité vers mon-espace
      navigate("/mon-espace");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: {
          prompt: "select_account",
        },
      });

      if (result?.error) {
        toast.error("Erreur de connexion Google : " + result.error.message);
      }
    } catch (err: any) {
      toast.error("Erreur de connexion Google : " + (err?.message || "Erreur inconnue"));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Un email de réinitialisation a été envoyé ! Vérifiez votre boîte de réception.");
      setIsForgotPassword(false);
    }
    setLoading(false);
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
          toast.error("Veuillez confirmer votre email. Un code de vérification vous a été envoyé.");
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
        if (data.session) {
          // Auto-confirm is enabled, redirect directly
          toast.success("Inscription réussie ! Bienvenue chez An Arwen 🐴");
          await handlePostLoginRedirect(data.user.id);
        } else {
          // Email confirmation required - show OTP input
          toast.success("Un code de vérification à 6 chiffres a été envoyé à votre email !");
          setOtpEmail(email);
          setIsOtpStep(true);
          setOtpCountdown(60);
        }
      }
    }
    setLoading(false);
  };

  // ═══════════════════════════════════════════
  // OTP VERIFICATION STEP
  // ═══════════════════════════════════════════
  if (isOtpStep) {
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
                  "Plus qu'un mot de passe, votre aventure mérite une vérification."
                </p>
              </blockquote>
              <div className="mt-8 flex items-center gap-4">
                <div className="h-1 w-12 bg-primary rounded" />
                <span className="text-sm font-medium">Ferme Équestre An Arwen</span>
              </div>
            </div>
          </div>

          {/* Right Column - OTP Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-md space-y-8">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="font-serif text-3xl font-bold">Vérification de votre email</h1>
                <p className="text-muted-foreground">
                  Un code à 6 chiffres a été envoyé à <strong className="text-foreground">{otpEmail}</strong>
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  className="w-full h-12 text-base gap-2"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Vérifier mon code
                    </>
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Vous n'avez pas reçu le code ?
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                    onClick={handleResendOtp}
                    disabled={resendLoading || otpCountdown > 0}
                  >
                    {resendLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {otpCountdown > 0
                      ? `Renvoyer dans ${otpCountdown}s`
                      : "Renvoyer le code"}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Pensez à vérifier vos spams si vous ne trouvez pas l'email.
                </p>

                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpStep(false);
                      setOtpCode("");
                      setIsLogin(true);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    ← Retour à la connexion
                  </button>
                </p>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

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
                {isResetPassword
                  ? "Nouveau mot de passe"
                  : isForgotPassword 
                    ? "Mot de passe oublié ?" 
                    : isLogin 
                      ? "Bon retour parmi nous !" 
                      : "Rejoignez l'aventure"}
              </h1>
              <p className="text-muted-foreground">
                {isResetPassword
                  ? "Définissez votre nouveau mot de passe"
                  : isForgotPassword 
                    ? "Entrez votre email pour recevoir un lien de réinitialisation"
                    : isLogin
                      ? "Connectez-vous pour accéder à votre espace cavalier"
                      : "Créez votre compte et préparez votre prochaine escapade équestre"}
              </p>
            </div>

            {isResetPassword ? (
              /* Reset Password Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
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
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Changer mon mot de passe
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(false);
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    Retour à la connexion
                  </button>
                </p>
              </form>
            ) : isForgotPassword ? (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPassword} className="space-y-4">
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

                <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Envoyer le lien de réinitialisation
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="font-medium text-primary hover:underline"
                  >
                    Retour à la connexion
                  </button>
                </p>
              </form>
            ) : (
              <>
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
                {isLogin && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <label 
                        htmlFor="remember" 
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Se souvenir de moi
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
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
                  Renvoyer le code de vérification
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
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Auth;
