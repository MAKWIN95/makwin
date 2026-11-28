import React from 'react';

// The title at the top of "your" pages (Siguiendo, Guardados, Notificaciones), all the same
// and in one small line: a little icon, the page's name, a dot and what is in it, so you
// always know where you are, even after arriving from an icon with no words.
export default function PageTitle({ icon, title, subtitle, children }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <span className="page-title-icon" aria-hidden="true">{icon}</span>
      <div className="page-title-words">
        <h1>{title}</h1>
        {subtitle && <><span className="page-title-dot" aria-hidden="true" /><p>{subtitle}</p></>}
      </div>
      {children}
    </div>
  );
}
