import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("contact_requests").insert([form]);
    setLoading(false);
    if (error) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } else {
      toast.success("Message envoyé avec succès !");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    }
  };

  return (
    <Layout>
      <section className="pt-32 pb-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-primary font-medium mb-4">Contact</span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">Contactez-nous</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Une question ? Une demande de devis ? N'hésitez pas à nous contacter.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <div className="bg-card rounded-3xl p-8 border border-border/50">
              <h2 className="font-serif text-2xl font-bold mb-6">Envoyez-nous un message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label htmlFor="name">Nom complet *</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label htmlFor="phone">Téléphone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label htmlFor="subject">Sujet</Label><Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                </div>
                <div><Label htmlFor="message">Message *</Label><Textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
                <Button type="submit" size="lg" disabled={loading}><Send className="mr-2 h-4 w-4" />{loading ? "Envoi..." : "Envoyer"}</Button>
              </form>
            </div>

            {/* Info */}
            <div className="space-y-8">
              <div className="bg-card rounded-3xl p-8 border border-border/50 space-y-6">
                <h2 className="font-serif text-2xl font-bold">Nos coordonnées</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4"><MapPin className="h-6 w-6 text-primary flex-shrink-0" /><div><p className="font-semibold">Adresse</p><p className="text-muted-foreground">5 Le Bignon, 35360 La Chapelle du Lou du Lac</p></div></div>
                  <div className="flex items-start space-x-4"><Phone className="h-6 w-6 text-primary flex-shrink-0" /><div><p className="font-semibold">Téléphone</p><a href="tel:+33299066868" className="text-muted-foreground hover:text-primary">02 99 06 68 68</a></div></div>
                  <div className="flex items-start space-x-4"><Mail className="h-6 w-6 text-primary flex-shrink-0" /><div><p className="font-semibold">Email</p><a href="mailto:contact@ferme-equestre-an-arwen.com" className="text-muted-foreground hover:text-primary">contact@ferme-equestre-an-arwen.com</a></div></div>
                </div>
              </div>
              <div className="rounded-3xl overflow-hidden aspect-video">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2675.0!2d-1.85!3d48.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDjCsDE1JzAwLjAiTiAxwrA1MScwMC4wIlc!5e0!3m2!1sfr!2sfr!4v1234567890" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Carte" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
