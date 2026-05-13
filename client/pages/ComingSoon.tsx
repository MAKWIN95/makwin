import { useEffect, useState } from "react";

export default function ComingSoon() {
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; duration: number }>>([]);

  useEffect(() => {
    // Set page title and meta tags for SEO
    document.title = "MAKWIN";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'A new layer of visual culture is forming.');
    }
    
    // OpenGraph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', 'MAKWIN');
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', 'A new layer of visual culture is forming.');
    }
    
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      const newOgImage = document.createElement('meta');
      newOgImage.setAttribute('property', 'og:image');
      newOgImage.setAttribute('content', '/makwin-og.jpg');
      document.head.appendChild(newOgImage);
    }
    
    setIsVisible(true);

    // Generate very subtle particles (reduced from 8 to 4)
    const newParticles = Array.from({ length: 4 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 20 + Math.random() * 15, // Slower movement
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden">
      {/* Film grain effect - extremely subtle */}
      <div className="absolute inset-0 opacity-[0.005] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='2'/%3E%3C/filter%3E%3Crect width='400' height='400' fill='%23fff' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px",
      }} />

      {/* Floating particles - very subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-20"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `float ${particle.duration}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className={`relative z-10 w-full min-h-screen flex flex-col justify-between px-6 py-8 md:py-12 transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        
        {/* Header */}
        <div className="flex justify-between items-start md:items-center">
          <div className="text-lg md:text-xl font-light tracking-widest opacity-90">
            MAKWIN
          </div>
          <div className="text-xs md:text-sm opacity-40 font-light">2026</div>
        </div>

        {/* Center section */}
        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-12 md:space-y-16">
          
          {/* Main headline */}
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <h1 className="text-4xl md:text-7xl lg:text-8xl font-light leading-tight tracking-tight" style={{ letterSpacing: "-0.01em" }}>
              Something for artists is taking shape.
            </h1>
            
            {/* Subheadline */}
            <p className="text-base md:text-lg lg:text-xl font-light opacity-60 leading-relaxed max-w-xl mx-auto">
              We are building a new environment for emerging visual culture.
            </p>
            
            <p className="text-base md:text-lg lg:text-xl font-light opacity-50">
              Not everything needs to be visible yet.
            </p>
          </div>
        </div>

        {/* Lower section */}
        <div className="space-y-12 md:space-y-16">
          
          {/* Follow section */}
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-6">
              <div className="text-xs md:text-sm font-light tracking-widest opacity-60 uppercase">
                Follow the evolution
              </div>
              <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
            
            {/* Social links */}
            <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-12">
              <a
                href="https://www.tiktok.com/@.makwin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm md:text-base font-light hover:opacity-100 opacity-60 transition-opacity duration-300 hover:underline"
              >
                TikTok
              </a>
              <a
                href="https://www.instagram.com/ig.makwin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm md:text-base font-light hover:opacity-100 opacity-60 transition-opacity duration-300 hover:underline"
              >
                Instagram
              </a>
              <a
                href="https://www.instagram.com/makwin.art"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm md:text-base font-light hover:opacity-100 opacity-60 transition-opacity duration-300 hover:underline"
              >
                Archive
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs md:text-sm opacity-40 font-light tracking-widest pt-8 md:pt-12 border-t border-white/10">
            MAKWIN — 2026
          </div>
        </div>
      </div>

      {/* Smooth animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-15px) translateX(8px);
            opacity: 0.25;
          }
          50% {
            transform: translateY(-30px) translateX(-8px);
            opacity: 0.2;
          }
          75% {
            transform: translateY(-15px) translateX(12px);
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
}
