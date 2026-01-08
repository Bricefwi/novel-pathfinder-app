import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else { toast.success("Connexion réussie !"); navigate("/"); }
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { first_name: firstName, last_name: lastName } }
      });
      if (error) toast.error(error.message);
      else toast.success("Inscription réussie ! Vérifiez votre email.");
    }
    setLoading(false);
  };

  return (
    <Layout>
      <section className="pt-32 pb-16 min-h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-card rounded-3xl p-8 border border-border/50">
            <h1 className="font-serif text-3xl font-bold text-center mb-8">{isLogin ? "Connexion" : "Inscription"}</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Prénom</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                  <div><Label>Nom</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                </div>
              )}
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>Mot de passe</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}</Button>
            </form>
            <p className="text-center mt-6 text-muted-foreground">
              {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">{isLogin ? "S'inscrire" : "Se connecter"}</button>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Auth;
