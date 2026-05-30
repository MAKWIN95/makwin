# 🔧 Migraciones SQL Requeridas - MAKWIN

**IMPORTANTE**: Ejecuta estos comandos en [Supabase SQL Editor](https://app.supabase.com) para que los bugs se arreglen.

---

## 1️⃣ Bug #1h: Google Auth Setup Modal

**Descripción**: Google OAuth users deberían pasar por un modal pidiendo username/password, pero no lo pide.

**SQL a ejecutar**:

```sql
-- Crear columna si no existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_setup_completed BOOLEAN DEFAULT false;

-- (Opcional) Marca usuarios Google existentes como ya completados
UPDATE profiles 
SET google_setup_completed = true 
WHERE id IN (
  SELECT user_id 
  FROM public.profiles p 
  WHERE EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = p.id 
    AND (u.raw_user_meta_data->>'provider')::text = 'google'
  )
)
AND google_setup_completed IS NULL;
```

**Qué buscar después**:
- Crea una **cuenta Google nueva** (desde navegador anónimo para que sea completamente nueva)
- Debería pedir username/password/displayName
- Si sigue sin pedir → hay problema con RLS

---

## 2️⃣ Bug #3a/3b: Works "Obra no encontrada"

**Descripción**: Al subir obra sale "obra no encontrada". Al clickear cualquier obra también sale.

**Este bug puede venir de varios lados. Ejecuta esto en orden**:

### Paso 1: Verifica si las works se están insertando

```sql
-- Ver últimas works insertadas
SELECT id, user_id, title, status, created_at 
FROM public.works 
ORDER BY created_at DESC 
LIMIT 10;
```

**¿Qué debería ver?**
- ✅ Si ves works recientes → el insert está funcionando
- ❌ Si NO ves nada o solo ves obras viejas → el insert está fallando

---

### Paso 2: Verifica el RLS Policy en tabla works

```sql
-- Ver políticas RLS en tabla works
SELECT * 
FROM pg_policies 
WHERE tablename = 'works';
```

**¿Qué buscar?**
- ✅ Debería haber una política que permita `SELECT` para todos (anónimos)
- ❌ Si no hay, es un problema de RLS que impide ver las obras

**Si falta la política SELECT, ejecuta esto**:

```sql
-- Permitir que TODOS vean obras publicadas
CREATE POLICY "Allow public to view published works"
  ON public.works
  FOR SELECT
  USING (status = 'published');

-- O más permisivo:
CREATE POLICY "Anyone can view works"
  ON public.works
  FOR SELECT
  USING (true);
```

---

### Paso 3: Verifica el RLS Policy en tabla profiles

```sql
-- Ver políticas RLS en profiles
SELECT * 
FROM pg_policies 
WHERE tablename = 'profiles';
```

**¿Qué buscar?**
- ✅ Debe permitir `SELECT` para que works pueda hacer JOIN con profiles
- ❌ Si falta, WorkDetail no puede traer info del artista

**Si falta, ejecuta esto**:

```sql
-- Permitir que TODOS vean perfiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);
```

---

### Paso 4: Verifica que el RPC get_feed está funcionando

```sql
-- Ver si el RPC existe
SELECT 
  n.nspname,
  p.proname,
  pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_feed';
```

**¿Qué buscar?**
- ✅ Si ves SQL definition → el RPC existe
- ❌ Si no ves nada → falta crear el RPC

**Si falta el RPC, créalo**:

```sql
CREATE OR REPLACE FUNCTION public.get_feed(
    p_user_id UUID,
    p_limit INT DEFAULT 40,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    user_id UUID,
    title TEXT,
    description TEXT,
    work_type TEXT,
    file_url TEXT,
    cover_url TEXT,
    lyrics TEXT,
    hashtags TEXT[],
    is_for_sale BOOLEAN,
    price NUMERIC,
    status TEXT,
    like_count INT,
    view_count INT,
    language TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    profiles JSON,
    liked_by_me BOOLEAN,
    saved_by_me BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.user_id,
    w.title,
    w.description,
    w.work_type,
    w.file_url,
    w.cover_url,
    w.lyrics,
    w.hashtags,
    w.is_for_sale,
    w.price,
    w.status,
    w.like_count,
    w.view_count,
    w.language,
    w.created_at,
    w.updated_at,
    ROW_TO_JSON(p.*) as profiles,
    (CASE WHEN l.id IS NOT NULL THEN true ELSE false END) as liked_by_me,
    (CASE WHEN s.id IS NOT NULL THEN true ELSE false END) as saved_by_me
  FROM public.works w
  LEFT JOIN public.profiles p ON w.user_id = p.id
  LEFT JOIN public.likes l ON w.id = l.work_id AND l.user_id = p_user_id
  LEFT JOIN public.saves s ON w.id = s.work_id AND s.user_id = p_user_id
  WHERE w.status = 'published'
  ORDER BY w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

---

## 3️⃣ Verificar después de ejecutar

Después de ejecutar todas las migraciones:

1. **Abre DevTools** en navegador (F12)
2. **Console tab**: Busca mensajes como:
   ```
   [SubmitWork] Inserting work: { workId: "2026-obra-1234", ... }
   [SubmitWork] Work saved to Supabase successfully: 2026-obra-1234
   ```
3. **Si ves error**: Cópialo y repórtamelo

---

## 📋 Resumen de pasos

```
1. ✅ Ejecuta: ALTER TABLE profiles ADD COLUMN google_setup_completed...
2. ✅ Ejecuta: SELECT * FROM works ORDER BY created_at DESC...
3. ✅ Ejecuta: SELECT * FROM pg_policies WHERE tablename = 'works'...
4. ✅ Si faltan políticas RLS, créalas
5. ✅ Si falta RPC, créalo
6. ✅ Vuelve a probar subir una obra
7. ✅ Abre DevTools y verifica logs
```

---

## ❓ Si aún no funciona

1. Copia el **error exacto** que ves en DevTools Console
2. Copia el **SQL completo** que ejecutaste
3. Repórtamelo para debugar más

---

**Última actualización**: 3 de Abril 2026
