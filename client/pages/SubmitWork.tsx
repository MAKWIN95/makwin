import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';

const workTypes = [
  { value: 'pintura', label: 'Pintura' },
  { value: 'fotografia', label: 'Fotografía' },
  { value: 'poema', label: 'Poema' },
  { value: 'cancion', label: 'Canción' },
];

const typesWithoutImage = ['poema', 'cancion', 'texto'];

export default function SubmitWork() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    artistName: '',
    email: '',
    workType: '',
    title: '',
    description: '',
    file: null as File | null,
    addCover: false,
    coverImage: null as File | null,
    hashtags: '' as string,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, coverImage: file }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, workType: value }));
  };

  const handleAddCoverToggle = (checked: boolean) => {
    setFormData(prev => ({ ...prev, addCover: checked, coverImage: null }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validación básica
      if (!formData.artistName || !formData.email || !formData.workType || !formData.title || !formData.description) {
        setError('Por favor completa todos los campos');
        setLoading(false);
        return;
      }

      // Si tiene portada habilitada, validar que la imagen esté presente
      const isNonImageWork = typesWithoutImage.includes(formData.workType);
      if (isNonImageWork && formData.addCover && !formData.coverImage) {
        setError('Por favor sube una imagen para la portada');
        setLoading(false);
        return;
      }

      // Validaciones por tipo de archivo
      if (formData.file) {
        const ft = formData.file.type || '';
        const name = formData.file.name.toLowerCase();
        if (formData.workType === 'cancion') {
          // permitir solo audio
          const allowed = ft.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.flac');
          if (!allowed) {
            setError('Para canciones solo se permiten archivos de audio (mp3, wav, flac)');
            setLoading(false);
            return;
          }
        }
        if (formData.workType === 'pintura' || formData.workType === 'fotografia') {
          const allowed = ft.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp)$/);
          if (!allowed) {
            setError('Para pinturas y fotografías solo se permiten imágenes');
            setLoading(false);
            return;
          }
        }
      }

      let fileUrl = '';
      let coverImageUrl = '';

      // Subir archivo principal
      if (formData.file) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        
        console.log('Cloudinary config:', { cloudName, uploadPreset });
        
        if (!cloudName || !uploadPreset) {
          setError('Error: Variables de Cloudinary no configuradas. Contacta al administrador.');
          setLoading(false);
          return;
        }
        const uploadData = new FormData();
        uploadData.append('file', formData.file);
        uploadData.append('upload_preset', uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: uploadData,
        });
        const cloudinaryResult = await res.json();
        if (!res.ok || !cloudinaryResult.secure_url) {
          setError('Error al subir el archivo a Cloudinary: ' + (cloudinaryResult.error?.message || 'Error desconocido'));
          setLoading(false);
          return;
        }
        fileUrl = cloudinaryResult.secure_url;
      }

      // Subir portada si está habilitada
      if (formData.coverImage) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        
        const uploadData = new FormData();
        uploadData.append('file', formData.coverImage);
        uploadData.append('upload_preset', uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: uploadData,
        });
        const cloudinaryResult = await res.json();
        if (!res.ok || !cloudinaryResult.secure_url) {
          setError('Error al subir la portada a Cloudinary');
          setLoading(false);
          return;
        }
        coverImageUrl = cloudinaryResult.secure_url;
      }

      // Enviar metadata y URL al backend
      // preparar hashtags array
      const tagsArray = formData.hashtags
        .split(/[,\s]+/)
        .map(s => s.replace(/^#/, '').trim())
        .filter(Boolean);

      const payload = {
        artistName: formData.artistName,
        email: formData.email,
        workType: formData.workType,
        title: formData.title,
        description: formData.description,
        language,
        fileUrl,
        coverImageUrl: coverImageUrl || null,
        hashtags: tagsArray,
      };

      const response = await fetch('/api/submit-work', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la obra');
      }

      // Éxito: limpiar formulario y redirigir
      setFormData({
        artistName: '',
        email: '',
        workType: '',
        title: '',
        description: '',
        file: null,
        addCover: false,
        coverImage: null,
        hashtags: '',
      });
      setError('');
      setTimeout(() => {
        navigate(`/obras-enviadas?success=true&id=${data.submissionId}`);
      }, 800);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al enviar la obra';
      setError(errorMsg);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      <main className="w-full page-enter">
        <div className="px-4 sm:px-8 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[hsl(var(--foreground))] mb-2">
                Enviar obra
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Comparte tu obra con nuestra comunidad de artistas emergentes
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Artist Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Nombre del artista
                </label>
                <Input
                  type="text"
                  name="artistName"
                  value={formData.artistName}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                />
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">El correo que facilites será publicado junto a tu obra para que otras personas puedan contactarte. También usaremos este correo para avisarte si tu obra es aceptada o denegada.</p>
              </div>

              {/* Work Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Tipo de obra
                </label>
                <Select value={formData.workType} onValueChange={handleSelectChange}>
                  <SelectTrigger className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--popover))] border border-[hsl(var(--border))]">
                    {workTypes.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-[hsl(var(--foreground))]">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Cover Toggle - Only for non-image works */}
              {formData.workType && typesWithoutImage.includes(formData.workType) && (
                <div className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.5]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-[hsl(var(--foreground))] cursor-pointer">
                        Añadir portada
                      </label>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        Sube una imagen como portada para dar más visibilidad a tu obra en el feed principal
                      </p>
                    </div>
                    <Switch
                      checked={formData.addCover}
                      onCheckedChange={handleAddCoverToggle}
                      className="ml-4"
                    />
                  </div>

                  {/* Cover Image Upload - Shows when toggle is on */}
                  {formData.addCover && (
                    <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                      <label className="text-sm font-medium text-[hsl(var(--foreground))] block mb-2">
                        Imagen de portada
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="w-full text-sm text-[hsl(var(--muted-foreground))] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-black/90 cursor-pointer"
                      />
                      {formData.coverImage && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                          Portada seleccionada: {formData.coverImage.name}
                        </p>
                      )}
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                        La imagen debe ser cuadrada (se recortará para adaptarse)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Título de la obra
                </label>
                <Input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Título"
                  className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Descripción
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe tu obra..."
                  rows={5}
                  className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] resize-none"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">Hashtags</label>
                <Input
                  type="text"
                  name="hashtags"
                  value={formData.hashtags}
                  onChange={handleChange}
                  placeholder="#paisaje, #poesia, #blues"
                  className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Escribe hashtags separados por comas o espacios. Ej: #poesia #amor</p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Archivo (imagen, documento, audio, etc.)
                </label>
                <input
                  type="file"
                  accept={formData.workType === 'cancion' ? 'audio/*' : (formData.workType === 'pintura' || formData.workType === 'fotografia' ? 'image/*' : '*/*')}
                  onChange={handleFileChange}
                  className="w-full text-sm text-[hsl(var(--muted-foreground))] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-black/90 cursor-pointer"
                />
                {formData.file && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Archivo seleccionado: {formData.file.name}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-black/90 transition-colors duration-200 active:scale-95"
                >
                  {loading ? 'Enviando...' : 'Enviar obra'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
