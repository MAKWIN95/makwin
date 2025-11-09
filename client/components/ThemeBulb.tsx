import React, { useEffect, useState } from "react";

export default function ThemeBulb() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch(e) {}
    } else {
      root.classList.remove("dark");
      try { localStorage.setItem("theme", "light"); } catch(e) {}
    }
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    const hasDark = root.classList.contains("dark");
    if (hasDark !== isDark) setIsDark(hasDark);
  }, []);

  // Ensure initial theme from localStorage is applied to the DOM on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const root = document.documentElement;
      if (stored === "dark") {
        root.classList.add("dark");
        setIsDark(true);
      } else if (stored === "light") {
        root.classList.remove("dark");
        setIsDark(false);
      }
    } catch (e) {}
  }, []);

  return (
    <button id="theme-bulb-btn"
      aria-pressed={isDark}
      aria-label={isDark ? "Activar tema claro" : "Activar tema oscuro"}
      title={isDark ? "Modo oscuro" : "Modo claro"}
      className={`theme-bulb fixed right-6 bottom-6 z-50 w-12 h-12 flex items-center justify-center transition-all duration-300`}
      onClick={() => {
        // Toggle state and ensure the DOM class is updated reliably
        setIsDark((s) => {
          const next = !s;
          try {
            const root = document.documentElement;
            if (next) root.classList.add("dark"); else root.classList.remove("dark");
            try { localStorage.setItem("theme", next ? "dark" : "light"); } catch(e) {}
            // quick verification log for debugging (can be removed later)
            console.log('Theme set (click):', next, 'root has dark:', root.classList.contains('dark'));
          } catch (e) {}
          return next;
        });
      }}
    >
      <svg
        width="36"
        height="36"
        viewBox="-3 -6 30 28"
        xmlns="http://www.w3.org/2000/svg"
        className="theme-bulb-svg"
        aria-hidden="true"
      >
  {/* Bulb filament + base */}
  <path className="bulb-base" d="M10 18h4v1.5a1 1 0 0 1-1 1H11a1 1 0 0 1-1-1V18z" strokeWidth="1" fill={isDark ? "#000" : "none"} />
  <path className="bulb-outline" d="M12 3.5a5 5 0 0 0-3.5 8.5V14a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-2A5 5 0 0 0 12 3.5z" strokeWidth="1.2" fill={isDark ? "#000" : "none"} />

        {/* Rays - draw outside the bulb so they don't overlap */}
        {!isDark && (
          <g stroke="#000" strokeWidth="1.4" strokeLinecap="round" fill="none">
            {/* center ray - much higher with large gap */}
            <line className="ray" x1="12" y1="-4.5" x2="12" y2="-1" />
            {/* left ray - far from bulb */}
            <line className="ray" x1="5" y1="4" x2="2.5" y2="1.5" />
            {/* right ray - far from bulb */}
            <line className="ray" x1="19" y1="4" x2="21.5" y2="1.5" />
          </g>
        )}
      </svg>
    </button>
  );
}
