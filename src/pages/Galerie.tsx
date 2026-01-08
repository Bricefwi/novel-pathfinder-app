import { Layout } from "@/components/layout/Layout";

const photos = [
  "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-25-scaled.jpg",
  "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-6-scaled.jpg",
  "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-3-scaled.jpg",
  "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-23-scaled.jpg",
  "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-10-scaled.jpg",
  "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-14-scaled.jpg",
];

const Galerie = () => (
  <Layout>
    <section className="pt-32 pb-16 bg-muted/30">
      <div className="container mx-auto px-4 text-center">
        <span className="inline-block text-primary font-medium mb-4">Galerie</span>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">Nos plus beaux moments</h1>
      </div>
    </section>
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((src, i) => (
            <div key={i} className="aspect-square rounded-2xl overflow-hidden group cursor-pointer">
              <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Galerie;
