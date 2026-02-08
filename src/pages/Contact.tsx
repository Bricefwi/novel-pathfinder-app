import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { COMPANY_CONFIG } from "@/config/constants";

// Validation schema with length limits and format checks
const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  email: z.string()
    .trim()
    .email("Adresse email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  phone: z.string()
    .trim()
    .max(20, "Le téléphone ne peut pas dépasser 20 caractères")
    .regex(/^[\d\s\+\-\(\)]*$/, "Format de téléphone invalide")
    .optional()
    .or(z.literal("")),
  subject: z.string()
    .trim()
    .max(200, "Le sujet ne peut pas dépasser 200 caractères")
    .optional()
    .or(z.literal("")),
  message: z.string()
    .trim()
    .min(10, "Le message doit contenir au moins 10 caractères")
    .max(5000, "Le message ne peut pas dépasser 5000 caractères"),
});

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "", gdprAccepted: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate input before submission
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setLoading(true);
    
    // Use validated and sanitized data
    const sanitizedData = {
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone || null,
      subject: result.data.subject || null,
      message: result.data.message,
    };
    
    const { error } = await supabase.from("contact_requests").insert([sanitizedData]);
    
    if (error) {
      setLoading(false);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
      return;
    }

    // Notify admins + send client acknowledgment
    try {
      await supabase.functions.invoke("notify-admin", {
        body: {
          type: "contact",
          data: {
            name: sanitizedData.name,
            email: sanitizedData.email,
            phone: sanitizedData.phone,
            subject: sanitizedData.subject,
            message: sanitizedData.message,
          },
        },
      });
    } catch (emailError) {
      console.error("Error sending notification:", emailError);
    }

    setLoading(false);
    toast.success("Message envoyé avec succès ! Vous recevrez un accusé de réception par email.");
    setForm({ name: "", email: "", phone: "", subject: "", message: "", gdprAccepted: false });
  };

  return (
    <Layout>
      <SEOHead {...seoConfigs.contact} />
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
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="gdpr"
                    checked={form.gdprAccepted || false}
                    onCheckedChange={(checked) => setForm({ ...form, gdprAccepted: !!checked })}
                  />
                  <Label htmlFor="gdpr" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                    J'accepte la <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">politique de confidentialité</a> *
                  </Label>
                </div>
                <Button type="submit" size="lg" disabled={loading || !form.gdprAccepted}><Send className="mr-2 h-4 w-4" />{loading ? "Envoi..." : "Envoyer"}</Button>
              </form>
            </div>

            {/* Info */}
            <div className="space-y-8">
              <div className="bg-card rounded-3xl p-8 border border-border/50 space-y-6">
                <h2 className="font-serif text-2xl font-bold">Nos coordonnées</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4"><MapPin className="h-6 w-6 text-primary flex-shrink-0" /><div><p className="font-semibold">Adresse</p><p className="text-muted-foreground">{COMPANY_CONFIG.address.short}</p></div></div>
                  <div className="flex items-start space-x-4"><Phone className="h-6 w-6 text-primary flex-shrink-0" /><div><p className="font-semibold">Téléphone</p><a href={`tel:+33${COMPANY_CONFIG.phone.replace(/\s/g, '').slice(1)}`} className="text-muted-foreground hover:text-primary">{COMPANY_CONFIG.phone}</a></div></div>
                  <div className="flex items-start space-x-4"><Mail className="h-6 w-6 text-primary flex-shrink-0" /><div><p className="font-semibold">Email</p><a href={`mailto:${COMPANY_CONFIG.email}`} className="text-muted-foreground hover:text-primary">{COMPANY_CONFIG.email}</a></div></div>
                </div>
              </div>
              <div className="rounded-3xl overflow-hidden aspect-video">
                <iframe src={COMPANY_CONFIG.maps.embedUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Carte" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
