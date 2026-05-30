import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WorkTypeIcon from './WorkTypeIcon';

interface PublishedWork {
  submissionId: string;
  artistName: string;
  workType: string;
  title: string;
  description: string;
  fileUrl: string | null;
  status: string;
  publishedAt: string;
}

const workTypeGradients: Record<string, string> = {
  musica: "from-purple-600 to-purple-900",
  música: "from-purple-600 to-purple-900",
  fotografia: "from-blue-600 to-blue-900",
  fotografía: "from-blue-600 to-blue-900",
  video: "from-red-600 to-red-900",
  texto: "from-amber-600 to-amber-900",
  poesia: "from-pink-600 to-pink-900",
  poesía: "from-pink-600 to-pink-900",
};

export default function PublishedWorks() {
  const [works, setWorks] = useState<PublishedWork[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const response = await fetch("/api/get-submissions");
        const data = await response.json();
        if (data.submissions) {
          const published = data.submissions.filter(
            (work: PublishedWork) => work.status === "published"
          );
          setWorks(published);
        }
      } catch (error) {
        console.error("Error fetching published works:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (works.length === 0) {
    return null;
  }

  return (
    <section className="py-12 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-[hsl(var(--foreground))] mb-2">
          Obras Recibidas
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-12">
          Nuevas creaciones de talentosos artistas
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {works.map((work) => (
            <WorkCard key={work.submissionId} work={work} onNavigate={() => navigate(`/work/${work.submissionId}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface WorkCardProps {
  work: PublishedWork;
  onNavigate: () => void;
}

function WorkCard({ work, onNavigate }: WorkCardProps) {
  const gradient = workTypeGradients[work.workType.toLowerCase()] || "from-gray-600 to-gray-800";
  
  // Para poemas, mostrar primeras líneas
  const isPoem = work.workType.toLowerCase().includes("poesia") || work.workType.toLowerCase().includes("poema") || work.workType.toLowerCase().includes("texto");
  const preview = isPoem ? `"${work.description.split('\n')[0].substring(0, 40)}..."` : null;

  return (
    <div
      onClick={onNavigate}
      className="group cursor-pointer space-y-2 hover:opacity-80 transition-opacity"
    >
      {/* Image/Preview Container */}
      <div className={`relative aspect-square rounded-md overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center border border-[hsl(var(--border))]`}>
        {/* Work type badge at bottom center, adaptive color */}
        {(() => {
          const imgSrc = work.fileUrl || null;
          const isPoemLocal = work.workType.toLowerCase().includes('poesia') || work.workType.toLowerCase().includes('poema') || work.workType.toLowerCase().includes('texto');
          const forceTheme = isPoemLocal && !imgSrc;
          return <WorkTypeIcon workType={work.workType} imageSrc={imgSrc} forceThemeColor={forceTheme} />;
        })()}
        {work.fileUrl && !isPoem ? (
          <img
            src={work.fileUrl}
            alt={work.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : isPoem ? (
          <div className="p-4 text-center flex items-center justify-center h-full">
            <p className="text-[hsl(var(--card-foreground))] text-xs sm:text-sm line-clamp-4">
              {preview}
            </p>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-2xl">🎨</span>
          </div>
        )}

        
      </div>

      {/* Metadata bar: fuera de la imagen, justo debajo */}
      <div className="mt-2 text-center px-1">
        <div className="w-full text-xs sm:text-sm px-2 py-1">
          <div className="text-center leading-tight text-sm font-medium break-words text-[hsl(var(--foreground))]">{work.title}</div>
          <div className="mt-0.5 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-xs gap-2">
            <div className="max-w-[60%] text-center break-words">{work.artistName}</div>
            <div aria-hidden className="text-[hsl(var(--muted-foreground))]">●</div>
            <div className="text-center whitespace-nowrap">{formatDate(work.publishedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

  function formatDate(ts?: string) {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
