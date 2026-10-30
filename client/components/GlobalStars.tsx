import { useEffect, useState } from 'react';

const generateStars = () => {
  const stars = [];
  // Every star is a running animation: phones get fewer so scrolling stays smooth.
  const onPhone = window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;
  const mainStars = onPhone ? 30 : 80;
  
  // Create 80 main stars
  for (let i = 0; i < mainStars; i++) {
    let x: number;
    if (i < mainStars * 0.75) {
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
    });
  }
  
  return stars;
};

export default function GlobalStars() {
  const [stars] = useState(generateStars);

  // Inject CSS keyframes on mount to ensure they exist
  useEffect(() => {
    if (!document.getElementById('stars-keyframes')) {
      const style = document.createElement('style');
      style.id = 'stars-keyframes';
      style.textContent = `
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div
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
          className="star"
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            animation: `twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
