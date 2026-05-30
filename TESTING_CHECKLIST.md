 # 🧪 GUÍA DE TESTING - Verificar Todos los Cambios

Sigue estos pasos para probar que cada feature funciona correctamente.

---

## ✅ TEST 1: AUTH MODAL (Like sin Login)

**Objetivo**: Verificar que aparece modal cuando intentas hacer like sin estar logeado

**Pasos**:
1. Ve a `https://makwin.vercel.app/galeria`
2. Busca cualquier obra de otro usuario
3. Haz clic en el corazón ❤️
4. **Esperado**: Aparece modal con:
   - Título: "Inicia sesión para continuar"
   - Dos botones: "Iniciar Sesión" y "Crear Cuenta"
5. Haz clic en "Iniciar Sesión" → Te lleva a `/login` ✅
6. Vuelve atrás (no inicies sesión)
7. Haz clic en "Crear Cuenta" → Te lleva a `/registro` ✅

---

## ✅ TEST 2: AUTH MODAL (Save sin Login)

**Objetivo**: Verificar que aparece modal al guardar sin login

**Pasos**:
1. En cualquier obra, haz clic en el marcador 🔖 (save)
2. **Esperado**: Aparece la misma modal ✅
3. Cierra modal (clic en X)

---

## ✅ TEST 3: REPORT MODAL

**Objetivo**: Verificar que el reporte funciona con modal formal

**Pasos**:
1. En cualquier obra, haz clic en la bandera 🚩
2. **Esperado**: Aparece modal con opciones:
   - ○ Derechos de autor / Copyright infringement
   - ○ Contenido +18 / Adult content
   - ○ Contenido ofensivo / Offensive content
   - ○ Spam
   - ○ Otro / Other
3. Selecciona "Otro" → **Esperado**: Aparece textarea personalizado ✅
4. Escribe algo en el textarea
5. Haz clic en "Enviar"
6. **Esperado**: Mensaje de éxito "Reporte enviado" por 2 segundos ✅
7. Modal se cierra automáticamente

---

## ✅ TEST 4: UNIQUE USERNAME VALIDATION

**Objetivo**: Verificar que no puedes registrarte con @ duplicado

**Pasos**:
1. Ve a `https://makwin.vercel.app/registro`
2. Llena los campos:
   - Nombre: Tu nombre
   - @ (username): Escribe muy lentamente **"makwin"** (username famoso)
3. **Esperado**: Después de 500ms aparece error rojo: "Este @ ya está en uso" ✅
4. Botón "Crear cuenta" está **deshabilitado** (más claro/opaco) ✅
5. Cambia el @ a algo único (ej: "mi_nombre_unico_123")
6. **Esperado**: Error desaparece, botón se habilita ✅

---

## ✅ TEST 5: MEJOR MENSAJE DE ERROR - LOGIN

**Objetivo**: Verificar que los errores de login son útiles

**Test 5a - Password incorrecto**:
1. Ve a `/login`
2. Email: `test@test.com` (cuenta existente)
3. Password: `wrongpassword123`
4. **Esperado**: "Email o contraseña incorrectos" ✅

**Test 5b - Email no existe**:
1. Email: `noexiste@test.com`
2. Password: `password123`
3. **Esperado**: "Este correo no está registrado" ✅

---

## ✅ TEST 6: MEJOR MENSAJE DE ERROR - REGISTER

**Objetivo**: Verificar que errores de registro son claros

**Test 6a - Email ya registrado**:
1. Ve a `/registro`
2. Interfenta registrar con un email que ya existe
3. **Esperado**: "Email ya registrado" con opción de ir a login ✅

**Test 6b - Username ya en uso** (cubierto en TEST 4)

---

## ✅ TEST 7: EDIT/DELETE OBRAS

**Objetivo**: Verificar que puedes editar/eliminar tus propias obras

**Precondición**: Debes estar logeado en tu propia cuenta

**Test 7a - Ver botones Edit/Delete**:
1. Ve a tu perfil: `https://makwin.vercel.app/u/tu_username`
2. **Esperado**: Ves tus obras con dos iconos pequeños:
   - ✏️ Pencil (edit)
   - 🗑️ Trash (delete)
3. **Importante**: Otros usuarios NO ven estos botones ✅
4. Haz clic en ✏️
5. **Esperado**: Aparece modal "Editar obra" con campos:
   - Título
   - Descripción
   - Hashtags

**Test 7b - Editar**:
1. Cambia el título a algo diferente
2. Haz clic en "Guardar cambios"
3. **Esperado**: Modal cierra y título se actualiza en la página ✅
4. Recarga la página → Cambio persiste en la BD ✅

**Test 7c - Eliminar**:
1. Abre otra obra propia
2. Haz clic en 🗑️
3. **Esperado**: Aparece modal con:
   - Icono ⚠️ de advertencia
   - Nombre de la obra
   - Botón rojo "Eliminar"
   - Botón "Cancelar"
4. Haz clic en "Eliminar"
5. **Esperado**: Obra desaparece de tu perfil ✅

---

## ✅ TEST 8: PÁGINA DE GUARDADOS ARREGLADA

**Objetivo**: Verificar que /favoritos funciona correctamente

**Precondición**: Debes estar logeado

**Pasos**:
1. Ve a cualquier obra y haz clic en 🔖 (save)
2. **Esperado**: Icono cambia (filled bookmark) ✅
3. Ve a `/favoritos` (desde el menú)
4. **Esperado**: La obra aparece en la galería ✅
5. Verifica que muestra:
   - Thumbnail/imagen
   - Título
   - @ del autor
   - Fecha de creación
   - Contador de likes

**Test de sincronización**:
1. Ve a una obra guardada en `/favoritos`
2. Haz clic en 🔖 para des-guardar
3. **Esperado**: Obra desaparece de `/favoritos` ✅

---

## ✅ TEST 9: BACK BUTTON

**Objetivo**: Verificar que el botón atrás (←) funciona bien

**Pasos**:
1. Ve a `/galeria`
2. Abre una obra (haz clic en cualquiera)
3. Haz clic en la flecha ← (back button)
4. **Esperado**: Vuelves a `/galeria` ✅
5. Abre un perfil de usuario (`/u/username`)
6. Haz clic en ←
7. **Esperado**: Vuelves a la página anterior ✅
8. **Bonus**: Usa browser back (Alt+←) → También funciona ✅

---

## ✅ TEST 10: LANGUAGE PREFERENCE PERSISTENCE

**Objetivo**: Verificar que el idioma se guarda en tu perfil

**Test 10a - Sin login (localStorage)**:
1. Abre la página en Español (ES)
2. Abre el selector de idioma (globo 🌍 en header)
3. Cambia a Inglés (EN)
4. **Esperado**: UI cambia a inglés ✅
5. Recarga la página (F5)
6. **Esperado**: Sigue en Inglés ✅ (guardado en localStorage)

**Test 10b - Con login (perfil)**:
1. Inicia sesión
2. Cambia a Español (ES)
3. Abre selector y verifica ✓ al lado de ES ✅
4. Recarga página
5. **Esperado**: Sigue en ES ✅ (cargado desde BD)
6. Cambia a Inglés (EN)
7. Log out desde `/configuracion`
8. Log in de nuevo
9. **Esperado**: Abre en EN (tu preferencia guardada) ✅

---

## 📋 OVERALL CHECKS

**Después de completar todos los tests, verifica**:

- [ ] No hay errores en la consola del navegador (F12 → Console)
- [ ] Todas las modales cierran limpiamente
- [ ] Los botones tienen hover effects (cambien de color)
- [ ] Las transiciones son suaves (sin parpadeos)
- [ ] Los mensajes de error son legibles
- [ ] El diseño es consistente (colores negros, no azules)

---

## ✅ RESULTADO ESPERADO

Si todos los tests pasan: **TODO FUNCIONA PERFECTAMENTE** ✅

**Total de tests**: 10 principales + verificaciones finales

