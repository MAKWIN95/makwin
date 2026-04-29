import { Link, useNavigate } from 'react-router-dom';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function Home() {
  const { language } = useI18n();
  const es = language === 'es';
  const navigate = useNavigate();
  
  // Initialize stars background animation
  useStarsBackground('home-stars-background');

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const sections = [
    {
      id: 'gallery',
      title: es ? 'Galería' : 'Gallery',
      description: es
        ? 'Descubre una colección curada de obras de artistas emergentes. Cada obra cuenta una historia única, desde pinturas digitales hasta fotografías conceptuales. En MAKWIN Galería encontrarás arte que desafía convenciones y celebra la originalidad.'
        : 'Discover a curated collection of works by emerging artists. Each work tells a unique story, from digital paintings to conceptual photography. In MAKWIN Gallery you will find art that challenges conventions and celebrates originality.',
      link: '/galeria',
      faqs: [
        {
          q: es ? '¿Cómo navego por la galería?' : 'How do I navigate the gallery?',
          a: es
            ? 'Usa los filtros y búsqueda para encontrar obras por tipo, artista o tema. Puedes guardar tus favoritas para verlas después.'
            : 'Use filters and search to find works by type, artist or subject. You can save your favorites to view later.'
        },
        {
          q: es ? '¿Puedo contactar directamente al artista?' : 'Can I contact the artist directly?',
          a: es
            ? 'Sí, en la página de cada obra puedes ver el perfil del artista y seguirlo.'
            : 'Yes, on each work page you can view and follow the artist profile.'
        }
      ]
    },
    {
      id: 'marketplace',
      title: es ? 'Marketplace' : 'Marketplace',
      description: es
        ? 'Compra y vende arte digital original en nuestra plataforma segura. Los artistas controlan sus precios y términos. Cada transacción es verificada y protegida, conectando coleccionistas con creadores de forma directa.'
        : 'Buy and sell original digital art on our secure platform. Artists control their prices and terms. Every transaction is verified and protected, connecting collectors with creators directly.',
      link: '/marketplace',
      faqs: [
        {
          q: es ? '¿Cuál es el costo de vender?' : 'What is the cost of selling?',
          a: es
            ? 'MAKWIN toma una comisión del 15% en cada venta. El 85% restante va directamente al artista.'
            : 'MAKWIN takes a 15% commission on each sale. The remaining 85% goes directly to the artist.'
        },
        {
          q: es ? '¿Cómo recibo mi dinero?' : 'How do I receive my money?',
          a: es
            ? 'Los pagos se transfieren automáticamente a tu cuenta bancaria después de cada venta.'
            : 'Payments are transferred automatically to your bank account after each sale.'
        }
      ]
    },
    {
      id: 'merch',
      title: es ? 'Tienda Oficial' : 'Official Store',
      description: es
        ? 'Explorar merchandising exclusivo de MAKWIN. Colección minimalist con diseño limpio, paleta blanco y negro. Prendas y accesorios de calidad que reflejan la esencia de MAKWIN. Cada pieza es un objeto de diseño.'
        : 'Explore exclusive MAKWIN merchandise. Minimalist collection with clean design, black and white palette. Quality apparel and accessories that reflect the essence of MAKWIN. Each piece is a design object.',
      link: '/merch',
      faqs: [
        {
          q: es ? '¿Dónde se produce el merch?' : 'Where is the merchandise produced?',
          a: es
            ? 'Nuestro merch es producido por manufactureros certificados con estándares éticos y ambientales.'
            : 'Our merchandise is produced by certified manufacturers with ethical and environmental standards.'
        },
        {
          q: es ? '¿Cuál es el tiempo de entrega?' : 'What is the delivery time?',
          a: es
            ? 'Los pedidos se envían dentro de 5-7 días hábiles y llegan en 10-15 días dependiendo de tu ubicación.'
            : 'Orders are shipped within 5-7 business days and arrive in 10-15 days depending on your location.'
        }
      ]
    }
  ];

  const FaqItem = ({ item }: { item: { q: string; a: string } }) => (
    <div className="border-b border-[hsl(var(--border))] py-4">
      <button
        onClick={() => setExpandedFaq(expandedFaq === item.q ? null : item.q)}
        className="w-full flex items-start justify-between gap-4 text-left hover:text-[hsl(var(--foreground))] transition-colors"
      >
        <span className="font-medium text-[hsl(var(--foreground))] flex-1">{item.q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[hsl(var(--muted-foreground))] shrink-0 transition-transform duration-200 ease-out ${
            expandedFaq === item.q ? 'rotate-180' : ''
          }`}
        />
      </button>
      {expandedFaq === item.q && (
        <p className="mt-3 text-[hsl(var(--muted-foreground))] leading-relaxed text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {item.a}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="home-stars-background" className="stars-background" />
      <div className="relative z-10">
        <Header />

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-24 page-enter">
          {/* Hero Section */}
          <div className="mb-20 sm:mb-32 text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-wider text-[hsl(var(--foreground))] mb-6 leading-tight">
              MAKWIN
            </h1>
            <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] font-light max-w-2xl mx-auto leading-relaxed">
              {es
                ? 'Real art, real experiences, real connections. Una plataforma donde el arte emergente se encuentra con coleccionistas apasionados.'
                : 'Real art, real experiences, real connections. A platform where emerging art meets passionate collectors.'}
            </p>
          </div>

          {/* Editorial Sections */}
          <div className="space-y-20 sm:space-y-32">
            {sections.map((section, idx) => (
              <section key={section.id} className="scroll-mt-20">
                {/* Section Title & Description */}
                <div className="mb-12">
                  <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-wide text-[hsl(var(--foreground))] mb-6">
                    {section.title}
                  </h2>
                  <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] leading-relaxed font-light max-w-3xl">
                    {section.description}
                  </p>
                </div>

                {/* CTA Button */}
                <div className="mb-12">
                  <Link
                    to={section.link}
                    className="inline-block px-8 py-3 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-medium hover:opacity-90 transition-all duration-200 ease-out"
                  >
                    {es ? 'Explorar' : 'Explore'} →
                  </Link>
                </div>

                {/* FAQ Section */}
                <div className="bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-2xl p-8 sm:p-10">
                  <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                    {es ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
                  </h3>
                  <div className="space-y-1">
                    {section.faqs.map((faq) => (
                      <FaqItem key={faq.q} item={faq} />
                    ))}
                  </div>
                </div>

                {/* Divider */}
                {idx < sections.length - 1 && (
                  <div className="mt-16 sm:mt-24 flex items-center gap-4">
                    <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                    <div className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                      {es ? 'Siguiente' : 'Next'}
                    </div>
                    <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-24 sm:mt-32 text-center py-12 sm:py-16 border-t border-[hsl(var(--border))]">
            <h3 className="text-2xl sm:text-3xl font-light text-[hsl(var(--foreground))] mb-6">
              {es ? '¿Listo para sumarte?' : 'Ready to join?'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/galeria"
                className="px-8 py-3 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-medium hover:opacity-90 transition-all duration-200 ease-out"
              >
                {es ? 'Explorar Galería' : 'Explore Gallery'}
              </Link>
              <Link
                to="/subir-obra"
                className="px-8 py-3 rounded-lg border border-[hsl(var(--foreground))] text-[hsl(var(--foreground))] font-medium hover:bg-[hsl(var(--muted))] transition-all duration-200 ease-out"
              >
                {es ? 'Subir Obra' : 'Upload Work'}
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
