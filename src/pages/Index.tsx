import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { GalleryPreviewSection } from "@/components/home/GalleryPreviewSection";
import { ContactPreviewSection } from "@/components/home/ContactPreviewSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <WhyUsSection />
      <ServicesSection />
      <TestimonialsSection />
      <GalleryPreviewSection />
      <ContactPreviewSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
