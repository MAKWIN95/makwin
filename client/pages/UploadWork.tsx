import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload } from 'lucide-react';

const WORK_TYPES_ES = [
  { value: 'pintura', label: 'Pintura' },
  { value: 'fotografia', label: 'Fotografía' },
  { value: 'poema', label: 'Poema' },
  { value: 'cancion', label: 'Canción' },
  { value: 'video', label: 'Video' },
];
const WORK_TYPES_EN = [
  { value: 'pintura', label: 'Painting' },
  { value: 'fotografia', label: 'Photography' },
  { value: 'poema', label: 'Poem' },
  { value: 'cancion', label: 'Song' },
  { value: 'video', label: 'Video' },
];

const MAX_IMAGE_MB = 10;
const MAX_AUDIO_MB = 50;

type UploadProgress = 'idle' | 'uploading_file' | 'uploading_cover' | 'saving' | 'done' | 'error';

export default function UploadWork() {
  console.log('[UploadWork] 🚀 Component loaded at:', new Date().toISOString());
  const { user, profile } = useAuth();
  const { language } = useI18n();
  const navigate = useNavigate();
  const es = language === 'es';

  console.log('[UploadWork] User:', user?.id, 'Language:', language);

  // Redirect to login if not authenticated
  if (!user) {
    console.log('[UploadWork] ⛔ Redirecting to login - no user');
    return <Navigate to="/login" replace />;
  }

  const workTypes = es ? WORK_TYPES_ES : WORK_TYPES_EN;
  const typesWithoutImage = ['poema', 'cancion'];

  const [form, setForm] = useState({
    title: '',
    description: '',
    workType: '',
    lyrics: '',
    hashtags: '',
    isForSale: false,
    price: '',
    addCover: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress>('idle');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [coverError, setCoverError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const err = validateFile(f, form.workType);
      setFileError(err ?? '');
    } else {
      setFileError('');
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setCoverFile(f);
    if (f) {
      const fileName = f.name.toLowerCase();
      if (fileName.endsWith('.gif')) {
        setCoverError(es ? 'Los GIFs no están permitidos en la portada.' : 'GIFs are not allowed for cover images.');
      } else {
        setCoverError('');
      }
    } else {
      setCoverError('');
    }
  };

  const validateFile = (f: File, type: string): string | null => {
    const fileName = f.name.toLowerCase();
    const mb = f.size / 1024 / 1024;
    
    // Block GIFs for all file types
    if (fileName.endsWith('.gif')) {
      return es ? 'Los GIFs no están permitidos. Por favor, sube PNG, JPG o WebP.' : 'GIFs are not allowed. Please upload PNG, JPG, or WebP.';
    }
    
    if (type === 'cancion') {
      if (!f.type.startsWith('audio/')) return es ? 'Solo se permiten archivos de audio.' : 'Only audio files allowed.';
      if (mb > MAX_AUDIO_MB) return es ? `El audio no puede superar ${MAX_AUDIO_MB}MB.` : `Audio cannot exceed ${MAX_AUDIO_MB}MB.`;
    } else if (type === 'pintura' || type === 'fotografia') {
      if (!f.type.startsWith('image/')) return es ? 'Solo se permiten imágenes.' : 'Only images allowed.';
      if (mb > MAX_IMAGE_MB) return es ? `La imagen no puede superar ${MAX_IMAGE_MB}MB.` : `Image cannot exceed ${MAX_IMAGE_MB}MB.`;
    }
    return null;
  };

  const uploadToStorage = async (f: File, bucket: string, path: string): Promise<string> => {
    const { error } = await supabase.storage.from(bucket).upload(path, f, { upsert: true });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('[UploadWork] 📤 handleSubmit triggered at:', new Date().toISOString());
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.workType || !form.description.trim()) {
      console.log('[UploadWork] ❌ Validation failed - missing fields');
      setError(es ? 'Rellena título, tipo y descripción.' : 'Fill in title, type and description.');
      return;
    }
    if (form.workType === 'cancion' && !form.lyrics.trim()) {
      console.log('[UploadWork] ❌ Validation failed - missing lyrics');
      setError(es ? 'Incluye la letra de la canción.' : 'Include the song lyrics.');
      return;
    }

    if (file) {
      const fileError = validateFile(file, form.workType);
      if (fileError) {
        console.log('[UploadWork] ❌ File validation failed:', fileError);
        setError(fileError);
        return;
      }
      
      // Block GIFs for all types
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.gif')) {
        const errorMsg = es ? 'Los GIFs no están permitidos. Por favor, sube PNG, JPG o WebP.' : 'GIFs are not allowed. Please upload PNG, JPG, or WebP.';
        console.log('[UploadWork] ❌ GIF blocked:', errorMsg);
        setError(errorMsg);
        return;
      }
    }

    console.log('[UploadWork] ✅ All validations passed, starting upload...');
    setProgress('uploading_file');
    let fileUrl: string | null = null;
    let coverUrl: string | null = null;

    try {
      console.log('[UploadWork] 📁 Starting upload process with file:', file?.name, 'Work type:', form.workType);
      
      if (file) {
        console.log('[UploadWork] 📤 Uploading main file...');
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        fileUrl = await uploadToStorage(file, 'works', path);
        console.log('[UploadWork] ✅ File uploaded:', fileUrl);
      }

      if (form.addCover && coverFile) {
        // Validate cover image - block GIFs
        const coverFileName = coverFile.name.toLowerCase();
        if (coverFileName.endsWith('.gif')) {
          const errorMsg = es ? 'Los GIFs no están permitidos en la portada.' : 'GIFs are not allowed for cover images.';
          console.log('[UploadWork] ❌ Cover GIF blocked:', errorMsg);
          setError(errorMsg);
          setProgress('error');
          return;
        }
        console.log('[UploadWork] 🖼️ Uploading cover image...');
        setProgress('uploading_cover');
        const ext = coverFile.name.split('.').pop();
        const path = `${user.id}/covers/${Date.now()}.${ext}`;
        coverUrl = await uploadToStorage(coverFile, 'works', path);
        console.log('[UploadWork] ✅ Cover uploaded:', coverUrl);
      }

      console.log('[UploadWork] 💾 Saving to database...');
      setProgress('saving');

      const tags = form.hashtags.split(/[,\s]+/).map(s => s.replace(/^#/, '').trim()).filter(Boolean);

      const newWorkData = {
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        work_type: form.workType,
        file_url: fileUrl,
        cover_url: coverUrl,
        lyrics: form.workType === 'cancion' ? form.lyrics.trim() : null,
        hashtags: tags,
        is_for_sale: form.isForSale,
        price: form.isForSale && form.price ? Number(form.price) : null,
        language,
        status: 'published',
      };

      const { data, error: dbError } = await supabase.from('works').insert(newWorkData).select('id').single();

      if (dbError) {
        console.log('[UploadWork] ❌ Database error:', dbError);
        const errorMsg = dbError.message || (es ? 'Error al guardar la obra' : 'Error saving work');
        throw new Error(errorMsg);
      }

      // Fetch full work data separately to avoid relationship issues
      const { data: fullWork } = await supabase
        .from('works')
        .select(`
          id,
          user_id,
          title,
          description,
          work_type,
          file_url,
          cover_url,
          lyrics,
          hashtags,
          is_for_sale,
          price,
          status,
          like_count,
          view_count,
          language,
          created_at,
          updated_at,
          profiles:profiles(
            id,
            username,
            display_name,
            bio,
            avatar_url,
            website,
            instagram_url,
            tiktok_url,
            is_verified,
            is_banned,
            language_preference,
            created_at
          )
        `)
        .eq('id', data.id)
        .single();

      console.log('[UploadWork] ✅ Saved to database! Work ID:', data?.id);
      setProgress('done');
      console.log('[UploadWork] 🎉 Upload complete, navigating to work page...');
      setTimeout(() => navigate(`/work/${data.id}`, { state: { work: fullWork } }), 1500);

    } catch (err: any) {
      console.error('[UploadWork] ❌ ERROR:', err);
      setProgress('error');
      let errorMessage = err.message ?? (es ? 'Error desconocido.' : 'Unknown error.');
      // Translate common errors
      if (errorMessage.includes('Could not embed')) {
        errorMessage = es ? 'Error al cargar los datos de la obra. Por favor, intenta de nuevo.' : 'Error loading work data. Please try again.';
      }
      if (errorMessage.includes('storage')) {
        errorMessage = es ? 'Error al subir el archivo. Verifica el tamaño y formato.' : 'Error uploading file. Check file size and format.';
      }
      setError(errorMessage);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all";
  const labelClass = "block text-sm font-medium text-[hsl(var(--foreground))] mb-1";
  const isLoading = progress === 'uploading_file' || progress === 'uploading_cover' || progress === 'saving';

  const progressLabel = {
    uploading_file: es ? 'Subiendo archivo…' : 'Uploading file…',
    uploading_cover: es ? 'Subiendo portada…' : 'Uploading cover…',
    saving: es ? 'Guardando…' : 'Saving…',
    done: es ? '¡Publicado!' : 'Published!',
    error: es ? 'Error' : 'Error',
    idle: '',
  }[progress];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header hideSearch />
      <main className="w-full page-enter">
        <div className="px-4 sm:px-8 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[hsl(var(--foreground))] mb-1">
                {es ? 'Subir obra' : 'Upload work'}
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {es ? `Subiendo como @${profile?.username}` : `Uploading as @${profile?.username}`}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Work type */}
              <div>
                <label className={labelClass}>{es ? 'Tipo de obra' : 'Work type'}</label>
                <select name="workType" value={form.workType} onChange={handleChange} required className={inputClass}>
                  <option value="">{es ? 'Selecciona un tipo' : 'Select a type'}</option>
                  {workTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Cover toggle for non-image works */}
              {form.workType && typesWithoutImage.includes(form.workType) && (
                <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{es ? 'Añadir imagen de portada' : 'Add cover image'}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {es ? 'Más visibilidad en el feed' : 'More visibility in the feed'}
                      </p>
                    </div>
                    <Switch checked={form.addCover} onCheckedChange={v => setForm(p => ({ ...p, addCover: v, }))} />
                  </div>
                  {form.addCover && (
                    <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                      <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleCoverChange}
                        className="w-full text-sm text-[hsl(var(--muted-foreground))] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[hsl(var(--foreground))] file:text-[hsl(var(--background))] cursor-pointer" />
                      {coverError && <p className="text-xs text-red-500 mt-2">{coverError}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className={labelClass}>{es ? 'Título' : 'Title'}</label>
                <input type="text" name="title" value={form.title} onChange={handleChange}
                  placeholder={es ? 'Título de la obra' : 'Work title'} required className={inputClass} />
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>{es ? 'Descripción' : 'Description'}</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4}
                  placeholder={es ? 'Cuéntanos sobre esta obra…' : 'Tell us about this work…'}
                  required className={`${inputClass} resize-none`} />
              </div>

              {/* Lyrics for songs */}
              {form.workType === 'cancion' && (
                <div>
                  <label className={labelClass}>{es ? 'Letra de la canción' : 'Song lyrics'}</label>
                  <textarea name="lyrics" value={form.lyrics} onChange={handleChange} rows={8}
                    placeholder={es ? 'Pega la letra aquí…' : 'Paste the lyrics here…'}
                    className={`${inputClass} resize-none font-mono text-xs`} />
                </div>
              )}

              {/* Hashtags */}
              <div>
                <label className={labelClass}>{es ? 'Etiquetas' : 'Tags'}</label>
                <input type="text" name="hashtags" value={form.hashtags} onChange={handleChange}
                  placeholder="#paisaje, #abstracto, #blues" className={inputClass} />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {es ? 'Separadas por comas o espacios' : 'Separated by commas or spaces'}
                </p>
              </div>

              {/* For sale toggle */}
              <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{es ? '¿Poner en venta?' : 'For sale?'}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {es ? 'Aparecerá en MAKWIN Marketplace' : 'Will appear in MAKWIN Marketplace'}
                    </p>
                  </div>
                  <Switch checked={form.isForSale} onCheckedChange={v => setForm(p => ({ ...p, isForSale: v }))} />
                </div>
                {form.isForSale && (
                  <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                    <label className={labelClass}>{es ? 'Precio (€)' : 'Price (€)'}</label>
                    <input type="number" name="price" value={form.price} onChange={handleChange}
                      min="0" step="0.01" placeholder="0.00" className={inputClass} />
                  </div>
                )}
              </div>

              {/* File upload */}
              {form.workType && (
                <div>
                  <label className={labelClass}>
                    {form.workType === 'cancion' ? (es ? 'Archivo de audio (mp3, wav, flac)' : 'Audio file (mp3, wav, flac)')
                      : form.workType === 'pintura' || form.workType === 'fotografia' ? (es ? 'Imagen' : 'Image')
                      : (es ? 'Archivo (opcional)' : 'File (optional)')}
                  </label>
                  <input type="file"
                    accept={form.workType === 'cancion' ? 'audio/*' : (form.workType === 'pintura' || form.workType === 'fotografia') ? 'image/*' : '*/*'}
                    onChange={handleFileChange}
                    className="w-full text-sm text-[hsl(var(--muted-foreground))] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[hsl(var(--foreground))] file:text-[hsl(var(--background))] cursor-pointer" />
                  {fileError && <p className="text-xs text-red-500 mt-2">{fileError}</p>}
                  {file && !fileError && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">{file.name} — {(file.size / 1024 / 1024).toFixed(2)}MB</p>}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isLoading}
                onClick={() => console.log('[UploadWork] 💾 Submit button clicked!')}
                className="w-full py-3 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{progressLabel}</>
                  : <><Upload className="w-4 h-4" />{es ? 'Publicar obra' : 'Publish work'}</>
                }
              </button>

            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
