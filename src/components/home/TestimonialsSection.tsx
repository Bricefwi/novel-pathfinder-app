import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    content:
      "Une expérience magique ! Les paysages bretons à cheval, c'est vraiment incroyable. L'équipe est aux petits soins et les chevaux sont parfaitement adaptés. Je recommande à 100% !",
    author: "Sophie D.",
    location: "Paris",
    rating: 5,
    activity: "Bretagne Romantique",
  },
  {
    id: 2,
    content:
      "Notre séjour au Maroc restera gravé dans nos mémoires. Galoper dans les dunes au coucher du soleil, dormir sous les étoiles... Un rêve devenu réalité grâce à An Arwen.",
    author: "Jean-Pierre M.",
    location: "Lyon",
    rating: 5,
    activity: "Séjour Maroc",
  },
  {
    id: 3,
    content:
      "Première randonnée équestre et certainement pas la dernière ! L'encadrement est parfait pour les débutants comme moi. J'ai adoré chaque instant.",
    author: "Marie L.",
    location: "Nantes",
    rating: 5,
    activity: "Chevalier Duguesclin",
  },
  {
    id: 4,
    content:
      "Le gîte est charmant et l'accueil chaleureux. Mes enfants ont adoré les cours d'équitation. Une parenthèse enchantée en famille.",
    author: "Claire B.",
    location: "Rennes",
    rating: 5,
    activity: "Stage famille",
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-24 bg-secondary text-secondary-foreground overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-primary font-medium mb-4">
            Témoignages
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ce que disent nos cavaliers
          </h2>
          <p className="text-secondary-foreground/70 text-lg">
            Découvrez les expériences de ceux qui ont vécu l'aventure An Arwen.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-card/10 backdrop-blur-sm rounded-3xl p-8 md:p-12">
            {/* Quote Icon */}
            <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Quote className="h-6 w-6 text-primary-foreground" />
            </div>

            {/* Content */}
            <div className="text-center">
              {/* Stars */}
              <div className="flex items-center justify-center space-x-1 mb-6">
                {Array.from({ length: currentTestimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-primary fill-primary"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl md:text-2xl font-serif italic text-secondary-foreground/90 mb-8 leading-relaxed">
                "{currentTestimonial.content}"
              </blockquote>

              {/* Author */}
              <div>
                <p className="font-semibold text-lg">{currentTestimonial.author}</p>
                <p className="text-secondary-foreground/60 text-sm">
                  {currentTestimonial.location} • {currentTestimonial.activity}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center space-x-4 mt-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full hover:bg-secondary-foreground/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Dots */}
              <div className="flex items-center space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? "w-8 bg-primary"
                        : "bg-secondary-foreground/30 hover:bg-secondary-foreground/50"
                    }`}
                    aria-label={`Témoignage ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full hover:bg-secondary-foreground/10"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
