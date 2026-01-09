import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { GalleryPreviewSection } from "@/components/home/GalleryPreviewSection";
import { ContactPreviewSection } from "@/components/home/ContactPreviewSection";
import { CTASection } from "@/components/home/CTASection";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";

const Index = () => {
  return (
    <Layout>
      <SEOHead {...seoConfigs.home} />
      <HeroSection />
      <WhyUsSection />
      <ServicesSection />
      <TestimonialsSection />
      <ReviewsSection />
      <GalleryPreviewSection />
      <ContactPreviewSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
