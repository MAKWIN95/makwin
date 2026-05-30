# 📋 MAKWIN - Testing Guide v2.0

> Fecha: Abril 2026  
> Deploy: makwin.vercel.app (auto-deploy desde GitHub main)  
> Git Branch: main

---

## 🎯 Status de Características

### ✅ COMPLETADAS Y LISTAS PARA PROBAR

#### 1. **Search - "No Results" Message**
- **Dónde**: Gallery (`/galeria`)
- **Test**: Busca un término que no existe (ej: "asdfghjkl")
- **Esperado**: Muestra "No hay resultados para 'asdfghjkl'" + botón "Limpiar búsqueda"
- **Status**: ✅ HECHO

#### 2. **Metadata en WorkCard**
- **Qué se mostró**: Debajo de cada obra en el feed
  - `@username` del artista (clickeable → perfil)
  - Fecha de publicación (DD/MM/YYYY en ES, MM/DD/YYYY en EN)
- **Dónde**: Gallery/Feed de obras
- **Status**: ✅ HECHO

#### 3. **Settings Button Hovers**
- **Qué mejoró**: Botones con transiciones suaves
  - Hover: Scale 1.02 + shadow mejorada
  - Active: Scale 0.98 para feedback táctil
- **Dónde**: `/configuracion`
- **Status**: ✅ HECHO

#### 4. **Email Template**
- **Qué se hizo**: Plantilla HTML professional con colores NEGROS (no azul)
- **Archivo**: `EMAIL_TEMPLATE_RESET_PASSWORD.html`
- **Instalar**: Copia el HTML a Supabase → Authentication → Email Templates → Reset Password
- **Status**: ✅ LISTO (requiere instalación manual en Supabase)

#### 5. **Search Results Retry**
- **Problema**: Obras recién subidas mostraban 404
- **Solución**: WorkDetail ahora reintenta 1 vez con delay de 2s
- **Status**: ✅ HECHO (requiere testing)

#### 6. **Documentación de Sistemas**
- **Principales**:
  - `SYSTEMS.md` - Guía completa de arquitectura
  - `AGENTS.md` - Referencia para futuros cambios
- **Status**: ✅ HECHO

---

### 🟡 EN PROGRESO / PARCIALMENTE COMPLETAS

#### 1. **Work Detail Load Retry**
- Intenta 1 vez si work no se encuentra
- Podría necesitar más retries dependiendo de Supabase latency
- **Status**: ✅ Implementado, requiere testing
- **Test Flow**:
  1. Sube obra nueva desde `/subir-obra`
  2. Espera a ser redirigido a `/work/:id`
  3. ¿Se carga correctamente o muestra "No encontrada"?

#### 2. **Likes Persistence**
- **Cambio esperado**: Cuando das like, el contador debe actualizarse inmediatamente
- **Status**: 🟡 REVISAR - El código debería funcionar pero confirmar:
  - [ ] Like count actualiza en cliente
  - [ ] Database registra el like
  - [ ] Dislike también funciona
  - [ ] Contador es persistente al recargar

---

### 🔴 PENDIENTE DE IMPLEMENTACIÓN

#### 1. **Auth Guards + Modal para Acciones Protegidas**
- Acciones protegidas: Like, Favorito, Subir obra, Reportar, Seguir
- **Debería mostrar**: Modal centrado pidiendo login si no estás autenticado
- **Status**: ❌ NO IMPLEMENTADO
- **Priority**: ALTA

#### 2. **Report Modal (En lugar de Alert)**
- **Actual**: Usa `prompt()` de texto libre
- **Nuevo**: Modal con opciones:
  - Derechos de autor
  - Contenido +18
  - Contenido ofensivo
  - Spam
  - Otro (textarea personalizado)
- **Status**: ❌ NO IMPLEMENTADO
- **Priority**: ALTA

#### 3. **Unique Username Validation**
- **Validar**: No permitir dos usuarios con mismo @
- **Donde**: Register page + Supabase constraint
- **Mensaje**: "Este @ ya está en uso"
- **Status**: ❌ NO IMPLEMENTADO
- **Priority**: ALTA

#### 4. **Edit/Delete Obra en Perfil Propio**
- **Dónde**: `/u/@username` (tu propio perfil)
- **Opciones**: [Editar] [Eliminar] en cada obra
- **Editar**: Solo título, descripción, hashtags
- **Eliminar**: Modal con confirmación
- **Status**: ❌ NO IMPLEMENTADO
- **Priority**: MEDIA

#### 5. **Saved Works Page Error**
- **Página**: `/favoritos`
- **Problema**: No muestran las obras guardadas
- **Status**: ❌ REQUIERE FIX
- **Priority**: MEDIA

#### 6. **Better Login/Register Error Messages**
- **Cambios necesarios**:
  - Si email NO existe en login → "¿No tienes cuenta? Registrate aquí"
  - Si email YA existe en register → "Este email ya está registrado. ¿Quieres entrar?"
  - Validar format de email
- **Status**: ❌ NO IMPLEMENTADO
- **Priority**: MEDIA

#### 7. **Back Button Navigation Fix**
- **Problema**: Flechita atrás a veces lleva a landing, debería ir a galería
- **Solución**: Home button → landing, Back button → histórico normal
- **Status**: ❌ REQUIERE FIX
- **Priority**: BAJA

#### 8. **Language Preference en Profile**
- **Dónde**: `/configuracion`
- **Guardar**: En `profiles.language_preference`
- **Persistencia**: Al cambiar idioma, TODO debe cambiar inmediatamente
- **Status**: ❌ NO IMPLEMENTADO
- **Priority**: MEDIA

---

## 🧪 PLAN DE TESTING

### Sesión 1: Comprobar Cambios Realizados

#### TEST 1: Search "No Results"
1. Ve a `/galeria`
2. Busca: "asdfghjkl" (algo que no existe)
3. **Esperado**: Mensaje "No hay resultados para 'asdfghjkl'" + botón "Limpiar búsqueda"
4. Haz click en "Limpiar" → Debería volver a mostrar todos los resultados
5. Status: ✅ PASS / ❌ FAIL

#### TEST 2: Metadata en WorkCard
1. Ve a cualquier obra en `/galeria`
2. Debería mostrar debajo:
   - Título
   - `@username` del artista (clickeable)
   - Fecha (DD/MM/YYYY si ES, MM/DD/YYYY si EN)
3. Click en `@username` → Debería ir a `/u/:username`
4. Status: ✅ PASS / ❌ FAIL

#### TEST 3: Settings Button Hovers
1. Ve a `/configuracion`
2. Hover sobre cualquier botón
3. **Esperado**: Ligero zoom (scale 1.02) + shadow mejorada
4. Click (presionado) → Debería sentirse como "presionado" (scale 0.98)
5. Status: ✅ PASS / ❌ FAIL

#### TEST 4: Email Template
1. **Manual**: Copia el contenido de `EMAIL_TEMPLATE_RESET_PASSWORD.html`
2. Ve a Supabase Dashboard → Authentication → Email Templates
3. Busca "Reset Password" y haz clic para editar
4. Reemplaza el contenido HTML actual por el nuevo
5. Haz click "Save"
6. **Verificar**: Colores son NEGROS (#000000), no azul
7. Status: ✅ INSTALADO / ❌ FALTA INSTALAR

### Sesión 2: Testing de Nuevas Características (Ready)

#### TEST 5: Work Detail Load Retry**
1. Sube una obra nueva desde `/subir-obra`
2. Completa el formulario y haz click "Subir"
3. **Esperado**: Después de completar, deberías ser redirigido a `/work/:id` Y la obra debería cargar
4. ¿O muestra "Obra no encontrada"?
5. Si muestra error → intenta dar F5 y debería cargar
6. Status: ✅ PASS / ❌ FAIL / 🟡 PARCIAL

---

## 📝 Notas Importantes

### Email Template - Instalación Manual Requerida
1. Archivo: `EMAIL_TEMPLATE_RESET_PASSWORD.html` en la raíz del proyecto
2. Copia TODO el contenido HTML (desde `<!DOCTYPE>` hasta `</html>`)
3. Supabase Dashboard → Tu Proyecto → Authentication → Email Templates
4. Click en "Reset Password" (pequeño lápiz de edit)
5. Borra todo el HTML actual
6. Pega el nuevo HTML
7. Click "Save"
8. Listo - El siguiente email de reset usará la nueva plantilla

### Testing en Español vs Inglés
- Las fechas deben cambiar según idioma: 
  - ES: `01/04/2026`
  - EN: `04/01/2026`
- Para cambiar idioma: Header → Selector de idioma (arriba derecha)

---

## 🐛 Problemas Conocidos (Por Arreglar)

| Issue | Severidad | Est. Tiempo | Notas |
|-------|-----------|------------|-------|
| Auth guards modal missing | 🔴 Alta | 2-3h | Afecta a like, favorites, upload, report |
| Report modal (text alert) | 🔴 Alta | 1h | Reemplazar prompt() con modal formal |
| Unique username validation | 🔴 Alta | 1h | Aplicar en Register y Supabase |
| Saved works page error | 🟡 Media | 1h | Database query issue |
| Back button navigation | 🟢 Baja | 30min | Mejorar navegación histórica |
| Edit/delete en perfil | 🟡 Media | 2h | Opciones solo en obras propias |
| Better login errors | 🟡 Media | 1h | UX improvements |
| Language preference | 🟡 Media | 1.5h | Persistir en profile |

---

## ✅ Verificación Final

Una vez todos los tests pasen, tacha los items:

- [ ] Search "No results" funciona
- [ ] Metadata (author@ y date) visible
- [ ] Settings buttons tienen mejorhover
- [ ] Email template instalado en Supabase
- [ ] Work detail carga obras recién publicadas
- [ ] Todos los tests documentados en este archivo

