import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const navbarRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const landingRef = useRef<HTMLDivElement | null>(null);

  const updateCarouselArrows = () => {
    const el = carouselRef.current;
    if (!el) return;

    const children = Array.from(el.querySelectorAll<HTMLElement>('.section'));
    if (children.length === 0) return;

    // determine which card is closest to center
    const containerCenter = el.scrollLeft + el.clientWidth / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    children.forEach((c, i) => {
      const childCenter = c.offsetLeft + c.clientWidth / 2;
      const d = Math.abs(childCenter - containerCenter);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    });

    // toggle is-active class
    children.forEach((c, i) => {
      if (i === closestIdx) c.classList.add('is-active'); else c.classList.remove('is-active');
    });

    setCanPrev(el.scrollLeft > 10);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    // Hero animations
    if (heroRef.current) {
      const title = heroRef.current.querySelector('.hero-title');
      const subtitle = heroRef.current.querySelector('.hero-subtitle');
      const cta = heroRef.current.querySelector('.hero-cta');
      const scrollIndicator = heroRef.current.querySelector('.scroll-indicator');

      gsap.set([title, subtitle, cta, scrollIndicator], { opacity: 0, y: 20 });

      gsap.timeline()
        .to(title, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 0)
        .to(subtitle, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.3)
        .to(cta, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.6)
        .to(scrollIndicator, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.8);

      // Floating animation for scroll indicator
      if (scrollIndicator) {
        gsap.to(scrollIndicator, {
          y: 8,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Hero explore spotlight: follow cursor and show subtle glow
      const heroBtn = heroRef.current.querySelector('.hero-explore-btn') as HTMLElement | null;
      if (heroBtn) {
        const onMove = (e: MouseEvent) => {
          const r = heroBtn.getBoundingClientRect();
          const mx = ((e.clientX - r.left) / r.width) * 100 + '%';
          const my = ((e.clientY - r.top) / r.height) * 100 + '%';
          heroBtn.style.setProperty('--mx', mx);
          heroBtn.style.setProperty('--my', my);
          heroBtn.classList.add('has-spot');
        };
        const onLeave = () => {
          heroBtn.style.setProperty('--mx', '50%');
          heroBtn.style.setProperty('--my', '50%');
          heroBtn.classList.remove('has-spot');
        };
        heroBtn.addEventListener('mousemove', onMove);
        heroBtn.addEventListener('mouseleave', onLeave);

        // cleanup
        (heroRef.current as any)._cleanupHeroBtn = () => {
          heroBtn.removeEventListener('mousemove', onMove);
          heroBtn.removeEventListener('mouseleave', onLeave);
        };
      }

      // Hide scroll indicator when user scrolls down
      const onScroll = () => {
        const si = document.querySelector('.scroll-indicator');
        if (!si) return;
        if (window.scrollY > 80) {
          gsap.to(si, { opacity: 0, y: -8, duration: 0.3 });
        } else {
          gsap.to(si, { opacity: 1, y: 0, duration: 0.3 });
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });

      // remove listener on cleanup
      const cleanupScrollListener = () => window.removeEventListener('scroll', onScroll);

      // attach cleanup to heroRef so outer cleanup can remove it
      (heroRef.current as any)._cleanupScroll = cleanupScrollListener;
    }

    // Create persistent stars background
    const createStars = () => {
      const container = document.querySelector('.stars-background') as HTMLElement;
      if (!container) return;

      container.innerHTML = '';

      for (let i = 0; i < 80; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // bias more stars towards the left side for composition
        let x: number;
        if (i < 60) {
          x = Math.random() * 40; // left-heavy
        } else {
          x = 40 + Math.random() * 60;
        }
        
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 0.5;
        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 1;

        star.style.left = x + '%';
        star.style.top = y + '%';
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.setProperty('--duration', duration + 's');
        star.style.setProperty('--delay', delay + 's');

        container.appendChild(star);
      }
    };

    createStars();

    // if in light theme, add extra light-mode stars for density
    try {
      const theme = document.documentElement.getAttribute('data-theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      if (theme === 'light') {
        const container = document.querySelector('.stars-background') as HTMLElement;
        if (container) {
          for (let i = 0; i < 40; i++) {
            const star = document.createElement('div');
            star.className = 'star star--light';
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = Math.random() * 2 + 0.5;
            star.style.left = x + '%';
            star.style.top = y + '%';
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.opacity = '0.6';
            container.appendChild(star);
          }
        }
      }
    } catch (e) {}

    // Hero to navbar transformation on scroll
    if (navbarRef.current) {
      gsap.to(navbarRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          onUpdate: (self) => {
            if (navbarRef.current) {
              const progress = self.progress;
              gsap.set(navbarRef.current, {
                opacity: Math.min(progress * 3, 1),
                pointerEvents: progress > 0.1 ? 'auto' : 'none',
              });
            }
          },
        },
      });
    }

    // If the user was asked to scroll to a particular section (via sessionStorage), do it now
    try {
      const from = sessionStorage.getItem('lastFromSection');
      if (from !== null) {
        const idx = Number(from);
        const target = sectionRefs.current[idx];
        if (target) {
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 160);
        }
        sessionStorage.removeItem('lastFromSection');
      }
    } catch (e) {}

    // Animated background particles
    const heroBackground = heroRef.current?.querySelector('.hero-bg');
    if (heroBackground && heroBackground.children.length === 0) {
      for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = i * 0.2 + 's';
        heroBackground.appendChild(particle);
      }

      // Detect when navbar is over a light/white background and toggle class
      const checkNavbarOverlap = () => {
        const nav = navbarRef.current;
        if (!nav) return;
        const rect = nav.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.bottom - 2; // just inside the navbar bottom
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        let onLight = false;
        if (el) {
          const section = el.closest('.section') as HTMLElement | null;
          if (section) {
            const bg = window.getComputedStyle(section).backgroundColor || '';
            // simple check: if background has high RGB values, consider it light
            const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (m) {
              const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
              const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
              if (lum > 0.85) onLight = true;
            }
          }
        }
        if (onLight) nav.classList.add('liquid-navbar--on-light'); else nav.classList.remove('liquid-navbar--on-light');
      };

      window.addEventListener('scroll', checkNavbarOverlap, { passive: true });
      window.addEventListener('resize', checkNavbarOverlap);
      // initial check
      setTimeout(checkNavbarOverlap, 120);

      // expose cleanup
      const cleanupNavOverlap = () => {
        window.removeEventListener('scroll', checkNavbarOverlap);
        window.removeEventListener('resize', checkNavbarOverlap);
      };
      (heroRef.current as any)._cleanupNavOverlap = cleanupNavOverlap;
    }

    // Scroll-triggered animations for sections
    sectionRefs.current.forEach((ref, idx) => {
      if (!ref) return;

      const content = ref.querySelector('.section-content');
      const image = ref.querySelector('.section-image');
      const button = ref.querySelector('.btn-liquid');

      if (idx % 4 === 0) {
        gsap.set(content, { opacity: 0, x: -100 });
        gsap.to(content, {
          scrollTrigger: {
            trigger: ref,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          opacity: 1,
          x: 0,
          duration: 1,
          ease: 'power3.out',
        });

        gsap.set(image, { opacity: 0, x: 100 });
        gsap.to(image, {
          scrollTrigger: {
            trigger: ref,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          opacity: 1,
          x: 0,
          duration: 1.2,
          delay: 0.2,
          ease: 'power3.out',
        });
      } else if (idx % 4 === 1) {
        gsap.set(content, { opacity: 0, y: 30 });
        gsap.to(content, {
          scrollTrigger: {
            trigger: ref,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
        });
      } else if (idx % 4 === 2) {
        gsap.set(image, { clipPath: 'inset(0% 100% 0% 0%)' });
        const revealEdge = ref.querySelector('.reveal-edge');

        // ensure revealEdge covers image initially with blurred border effect
        if (revealEdge) {
          (revealEdge as HTMLElement).style.width = '100%';
          (revealEdge as HTMLElement).style.opacity = '1';
        }

        gsap.to(image, {
          scrollTrigger: {
            trigger: ref,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.2,
          ease: 'power3.out',
          onComplete: () => {
            // after reveal, shrink the overlay to create a soft blurred border
            if (revealEdge) gsap.to(revealEdge, { width: '0%', duration: 0.9, ease: 'power2.out', delay: 0.02 });
          }
        });

        gsap.set(content, { opacity: 0, x: 50 });
        gsap.to(content, {
          scrollTrigger: {
            trigger: ref,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          opacity: 1,
          x: 0,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
        });
      } else {
        gsap.set(image, { opacity: 0, filter: 'blur(15px)' });
        gsap.to(image, {
          scrollTrigger: {
            trigger: ref,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'power3.out',
        });

        gsap.set(content, { opacity: 0, y: 40 });
        gsap.to(content, {
          scrollTrigger: {
            trigger: ref,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
        });
      }

      if (button) {
        button.addEventListener('mouseenter', () => {
          gsap.to(button, { scale: 1.05, duration: 0.3, ease: 'power2.out' });
        });
        button.addEventListener('mouseleave', () => {
          gsap.to(button, { scale: 1, duration: 0.3, ease: 'power2.out' });
        });
      }
    });

    gsap.to('.hero-bg', {
      y: () => window.innerHeight * 0.5,
      scrollTrigger: {
        trigger: heroRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
    });

    const carouselEl = document.querySelector('.sections-wrapper.horizontal-carousel') as HTMLDivElement | null;
    if (carouselEl) {
      carouselRef.current = carouselEl as HTMLDivElement;
      carouselEl.addEventListener('scroll', updateCarouselArrows, { passive: true });
      // initial
      setTimeout(() => updateCarouselArrows(), 80);
      // position arrows initially
      setTimeout(() => positionCarouselArrows(), 120);
      window.addEventListener('resize', positionCarouselArrows);
      window.addEventListener('scroll', positionCarouselArrows, { passive: true });
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      // call internal cleanup if present
      if (heroRef.current && (heroRef.current as any)._cleanupScroll) {
        (heroRef.current as any)._cleanupScroll();
      }
      if (heroRef.current && (heroRef.current as any)._cleanupNavOverlap) {
        (heroRef.current as any)._cleanupNavOverlap();
      }
      if (heroRef.current && (heroRef.current as any)._cleanupHeroBtn) {
        (heroRef.current as any)._cleanupHeroBtn();
      }
      // cleanup carousel listeners
      if (carouselRef.current) {
        carouselRef.current.removeEventListener('scroll', updateCarouselArrows);
      }
      window.removeEventListener('resize', positionCarouselArrows);
      window.removeEventListener('scroll', positionCarouselArrows);
    };
  }, []);

  const handleScrollToSections = () => {
    const sectionsWrapper = document.querySelector('.sections-wrapper');
    if (sectionsWrapper) {
      sectionsWrapper.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigate = useNavigate();

  const navigateWithTransition = (path: string) => (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    // create a quick overlay to smooth the transition
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);
    // animate in
    gsap.to(overlay, { opacity: 1, duration: 0.18, ease: 'power1.in', onComplete: () => {
      navigate(path);
      // remove overlay after a short delay so the new page can render
      setTimeout(() => { gsap.to(overlay, { opacity: 0, duration: 0.12, onComplete: () => overlay.remove() }); }, 160);
    }});
  };

  const scrollCarousel = (dir: 'next' | 'prev') => {
    const el = carouselRef.current;
    if (!el) return;

    const children = Array.from(el.querySelectorAll<HTMLElement>('.section'));
    if (children.length === 0) return;

    // determine current visible index by closest offsetLeft to scrollLeft
    const sLeft = el.scrollLeft;
    let currentIndex = 0;
    let minDiff = Infinity;
    children.forEach((c, i) => {
      const diff = Math.abs(c.offsetLeft - sLeft);
      if (diff < minDiff) { minDiff = diff; currentIndex = i; }
    });

    const targetIndex = dir === 'next' ? Math.min(currentIndex + 1, children.length - 1) : Math.max(currentIndex - 1, 0);
    if (targetIndex === currentIndex) return;

    const currentCard = children[currentIndex];
    const nextCard = children[targetIndex];
    if (!currentCard || !nextCard) {
      // fallback: smooth scroll one viewport
      const offset = dir === 'next' ? el.clientWidth * 0.78 : -el.clientWidth * 0.78;
      const target = Math.max(0, Math.min(el.scrollLeft + offset, el.scrollWidth - el.clientWidth));
      gsap.to(el, { scrollLeft: target, duration: 1.2, ease: 'power2.inOut', overwrite: 'auto' });
      return;
    }

    // center the target card in the viewport
    const targetChild = children[targetIndex];
    const targetLeft = Math.max(0, targetChild.offsetLeft - (el.clientWidth - targetChild.clientWidth) / 2);

    const duration = 1.2;
    // animate only the scrollLeft of the container; card scale is handled by CSS .is-active
    gsap.to(el, {
      scrollLeft: targetLeft,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onUpdate: () => updateCarouselArrows(),
      onComplete: () => setTimeout(() => updateCarouselArrows(), 20),
    });
  };

  const positionCarouselArrows = () => {
    const el = carouselRef.current;
    const landingEl = landingRef.current || document.querySelector('.landing-container') as HTMLElement | null;
    const prev = document.querySelector('.carousel-prev') as HTMLElement | null;
    const next = document.querySelector('.carousel-next') as HTMLElement | null;
    if (!el || !landingEl || (!prev && !next)) return;
    const card = el.querySelector('.section') as HTMLElement | null;
    if (!card) return;
    const cardRect = card.getBoundingClientRect();
    const landingRect = landingEl.getBoundingClientRect();
    // center of the card, then nudge arrows slightly above the visual center
    const centerY = cardRect.top - landingRect.top + (cardRect.height / 2);
    const arrowH = 88; // matches CSS
    const nudgeUp = 12; // px to lift arrows above the card center
    const topPos = Math.max(12, centerY - (arrowH / 2) - nudgeUp);
    const elRect = el.getBoundingClientRect();
    const leftPrev = elRect.left - landingRect.left + 24;
    const leftNext = elRect.right - landingRect.left - 24 - 56; // 56 arrow width
    if (prev) { prev.style.top = `${topPos}px`; prev.style.left = `${leftPrev}px`; }
    if (next) { next.style.top = `${topPos}px`; next.style.left = `${leftNext}px`; }
  };

  const sections = [
    {
      title: 'MAKWIN Galería',
      desc: 'Descubre obras seleccionadas de artistas emergentes. Nuestra galería principal exhibe el mejor talento contemporáneo.',
      link: '/galeria',
      buttonText: 'Explorar',
      bgPattern: 'pattern-1',
    },
    {
      title: 'MAKWIN Marketplace',
      desc: 'Descubre tu obra favorita y recíbela en casa. Plataforma donde artistas y coleccionistas se encuentran para compartir y adquirir arte único.',
      link: '/marketplace',
      buttonText: 'Descubrir obras',
      bgPattern: 'pattern-2',
    },
    {
      title: 'MAKWIN Merch',
      desc: 'La tienda oficial de MAKWIN. Colección de ropa y accesorios minimalista con diseño limpio, paleta blanco y negro. Prendas de calidad que reflejan la esencia de MAKWIN.',
      link: '/merch',
      buttonText: 'Descubrir el merch',
      bgPattern: 'pattern-3',
    },
    {
      title: 'MAKWIN Locales',
      desc: 'Algún día nuestros espacios físicos harán posible la experiencia inmersiva del arte MAKWIN.',
      link: '/galeria',
      bgPattern: 'pattern-4',
      special: true,
    },
  ];

  return (
    <div className="landing-container" ref={landingRef}>
      <div className="stars-background"></div>

      <nav ref={navbarRef} className="liquid-navbar"
        onMouseMove={(e) => {
          const el = navbarRef.current as HTMLElement | null;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const mx = ((e.clientX - r.left) / r.width) * 100 + '%';
          const my = ((e.clientY - r.top) / r.height) * 100 + '%';
          el.style.setProperty('--mx', mx);
          el.style.setProperty('--my', my);
        }}
        onMouseLeave={() => {
          const el = navbarRef.current as HTMLElement | null;
          if (!el) return;
          el.style.setProperty('--mx', '50%');
          el.style.setProperty('--my', '50%');
        }}
      >
        <div className="navbar-content">
          <div className="navbar-brand">MAKWIN</div>
          <div className="navbar-center">Real art, real experiences, real connections</div>
          <a href="/galeria" onClick={navigateWithTransition('/galeria')} className="btn btn-navbar">
            Galería
          </a>
        </div>
      </nav>

      <section ref={heroRef} className="hero-section">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">MAKWIN</h1>
          <p className="hero-subtitle">Real art, real experiences, real connections</p>
          <div className="hero-cta">
            <button onClick={handleScrollToSections} className="btn btn-liquid hero-explore-btn">
              Explorar
            </button>
          </div>
          <div className="scroll-indicator">
            <svg width="56" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M22 12l-10 10L2 12" />
            </svg>
          </div>
        </div>
      </section>

      <div className="sections-wrapper horizontal-carousel">
        {sections.map((section, idx) => (
          <section
            key={idx}
            ref={(el: HTMLDivElement | null) => {
              sectionRefs.current[idx] = el;
            }}
            className={`section section-${idx} ${section.bgPattern} ${section.special ? 'special' : ''}`}
          >
            <div className="section-inner">
              <div className="section-content">
                <h2 className="section-title">{section.title}</h2>
                <p className="section-desc">{section.desc}</p>
                <Link
                  to={section.link}
                  className="btn btn-liquid"
                  onClick={() => {
                    try { sessionStorage.setItem('lastFromSection', String(idx)); } catch (e) {}
                  }}
                >
                  {section.special ? 'Soñar' : (section.buttonText || 'Explorar')}
                </Link>
              </div>
              <div className="section-image">
                <div className={`image-placeholder ${section.bgPattern}`}></div>
                {/* overlay used for blurred expanding border during reveal */}
                <div className="reveal-edge" />
              </div>
            </div>
          </section>
        ))}
      </div>

      <button aria-hidden className={`carousel-arrow carousel-prev ${canPrev ? 'visible' : ''}`} onClick={() => scrollCarousel('prev')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button aria-hidden className={`carousel-arrow carousel-next ${canNext ? 'visible' : ''}`} onClick={() => scrollCarousel('next')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
      </button>

      <div className="footer-spacer"></div>
    </div>
  );
}
