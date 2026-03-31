import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { useStarsBackground } from '@/hooks/use-stars-background';

export default function Merch() {
  // Initialize stars background
  useStarsBackground('merch-stars-background');

  // On MAKWIN click, reload page (in this case, just visual reset)
  useEffect(() => {
    const onReload = () => {
      // In this case, merch is static, so just visual confirmation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.addEventListener('reloadGallery', onReload as EventListener);
    return () => document.removeEventListener('reloadGallery', onReload as EventListener);
  }, []);

  const dummy = Array.from({ length: 6 }).map((_, i) => ({ id: i + 1, name: `MAKWIN Tee ${i + 1}`, price: (60 + i * 10) }));
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="merch-stars-background" className="stars-background"></div>
      <div className="relative z-10 page-enter">
        <Header showSearchCentered={true} />
        <main className="px-4 sm:px-8 py-12 page-enter">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-light mb-4">MAKWIN Merch</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-8">Colección minimalista de ropa MAKWIN — placeholder.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {dummy.map(p => (
                <article key={p.id} className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                  <div className="h-56 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"> 
                    <span className="text-2xl">🖤</span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium">{p.name}</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">€{p.price}</p>
                    <div className="mt-4 flex gap-2">
                      <Link to="#" className="btn">Ver</Link>
                      <Link to="#" className="btn">Comprar</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
