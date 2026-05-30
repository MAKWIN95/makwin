import { Link, useNavigate } from 'react-router-dom';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';

export default function Home() {
  const { language } = useI18n();
  const es = language === 'es';
  const navigate = useNavigate();
  const [showHeader, setShowHeader] = useState(false);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  
  // Initialize stars background animation
  useStarsBackground('home-stars-background');

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Use IntersectionObserver to detect when hero title leaves viewport
  useEffect(() => {
    if (!heroTitleRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When title is NOT visible (intersectionRatio < threshold), show header
        setShowHeader(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(heroTitleRef.current);
    return () => observer.disconnect();
  }, []);

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
            ? 'Cada obra tiene el perfil del artista. En su página de perfil encontrarás sus redes sociales e información de contacto.'
            : 'Each work displays the artist profile. You can visit their profile page to find their social media and contact information.'
        }
      ]
    },
    {
      id: 'attuned',
      title: 'ATTUNED',
      description: es
        ? 'Entrena tu percepción sensorial con experiencias interactivas innovadoras. ATTUNED es una serie de juegos que desafían tu vista, oído y sentido del tiempo. Mejora tu precisión sensorial y compite en las leaderboards globales.'
        : 'Train your sensory perception with innovative interactive experiences. ATTUNED is a series of games that challenge your sight, hearing, and sense of time. Improve your sensory accuracy and compete on global leaderboards.',
      link: '/attuned',
      faqs: [
        {
          q: es ? '¿Cómo funciona ATTUNED?' : 'How does ATTUNED work?',
          a: es
            ? 'Cada experiencia (ColorResonance, TonalRecognition, TemporalCalibration) te desafía a afinar un aspecto diferente de tu percepción. Selecciona el número de rondas y comienza.'
            : 'Each experience (ColorResonance, TonalRecognition, TemporalCalibration) challenges you to refine a different aspect of your perception. Select the number of rounds and begin.'
        },
        {
          q: es ? '¿Hay competencia?' : 'Is there competition?',
          a: es
            ? 'Sí, tus scores se registran en las leaderboards globales. Compite con artistas de todo el mundo y mejora tu ranking.'
            : 'Yes, your scores are recorded on global leaderboards. Compete with artists worldwide and improve your ranking.'
        }
      ]
    },
    {
      id: 'marketplace',
      title: es ? 'Marketplace' : 'Marketplace',
      description: es
        ? 'Plataforma para comprar y vender arte digital original. Conecta coleccionistas con artistas de forma segura y directa. Próximamente.'
        : 'Platform to buy and sell original digital art. Connect collectors with artists securely and directly. Coming soon.',
      link: '/marketplace',
      faqs: [
        {
          q: es ? '¿Cuándo está disponible?' : 'When is it available?',
          a: es
            ? 'Estamos trabajando en llevar el marketplace a la vida. Pronto podrás comprar y vender arte directamente en MAKWIN.'
            : 'We are working to bring the marketplace to life. Soon you will be able to buy and sell art directly on MAKWIN.'
        },
        {
          q: es ? '¿Cómo funcionará?' : 'How will it work?',
          a: es
            ? 'Te lo contaremos muy pronto. Síguenos para las actualizaciones.'
            : 'We will tell you very soon. Follow us for updates.'
        }
      ]
    },
    {
      id: 'merch',
      title: es ? 'Tienda Oficial' : 'Official Store',
      description: es
        ? 'Merchandising exclusivo de MAKWIN. Colección de diseño limpio y minimalista. Próximamente disponible.'
        : 'Exclusive MAKWIN merchandise. Clean and minimalist design collection. Coming soon.',
      link: '/merch',
      faqs: [
        {
          q: es ? '¿Cuándo puedo comprar?' : 'When can I shop?',
          a: es
            ? 'La tienda estará disponible pronto. Ten atento este espacio.'
            : 'The store will be available soon. Stay tuned.'
        },
        {
          q: es ? '¿Qué tipo de prendas habrá?' : 'What kind of apparel will there be?',
          a: es
            ? 'Ropa y accesorios de calidad con diseño MAKWIN. Pronto descubrirás la colección completa.'
            : 'Quality apparel and accessories with MAKWIN design. You will discover the full collection soon.'
        }
      ]
    }
  ];

  const FaqItem = ({ item }: { item: { q: string; a: string } }) => (
    <div className="border-b border-[rgba(120,120,120,0.25)] py-4">
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
        {showHeader && <Header hideSearch={true} showSearch={false} />}

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-24 page-enter">
          {/* Hero Section */}
          <div className="mb-20 sm:mb-32 text-center">
            <h1 
              ref={heroTitleRef}
              className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-wider text-[hsl(var(--foreground))] mb-6 leading-tight"
            >
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
