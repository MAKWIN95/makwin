import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/use-theme';

const generateStars = (isDark: boolean) => {
  const stars = [];
  
  // Create 80 main stars
  for (let i = 0; i < 80; i++) {
    let x: number;
    if (i < 60) {
      x = Math.random() * 40;
    } else {
      x = 40 + Math.random() * 60;
    }
    
    const y = Math.random() * 100;
    const size = Math.random() * 2 + 0.5;
    const duration = Math.random() * 3 + 2;
    const delay = Math.random() * 1;
    
    stars.push({
      id: `star-${i}`,
      x,
      y,
      size,
      duration,
      delay,
      isDark,
      isLight: false,
    });
  }
  
  // Extra stars in light mode
  if (!isDark) {
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 2 + 0.5;
      
      stars.push({
        id: `star-light-${i}`,
        x,
        y,
        size,
        duration: 0,
        delay: 0,
        isDark: false,
        isLight: true,
      });
    }
  }
  
  return stars;
};

export default function GlobalStars() {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState(() => generateStars(false));

  useEffect(() => {
    // Regenerate stars when theme changes
    setStars(generateStars(isDark));
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className="global-stars-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star ${star.isDark ? 'star--dark' : star.isLight ? 'star--light' : ''}`}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            animation: star.duration > 0 ? `twinkle ${star.duration}s ease-in-out infinite` : 'none',
            animationDelay: `${star.delay}s`,
            opacity: star.isLight ? 0.6 : undefined,
          }}
        />
      ))}
    </div>
  );
}
