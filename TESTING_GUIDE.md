# 🧪 GUÍA DE TESTING - Nuevas Funcionalidades

**Fecha:** 1 de abril de 2026  
**Estado:** Deploy en progreso en Vercel

---

## 📋 Preparación

1. **Espera 3-5 minutos** a que Vercel termine el deploy
2. **Limpia el caché del navegador:**
   - Abre DevTools (F12)
   - Application → Clear site data (marca TODO)
   - Cierra el navegador completamente
3. **Abre en navegador privado/incógnito** si es posible
4. Abre https://makwin.vercel.app

---

## ✅ TEST 1: Resetear Contraseña vía Email

**Objetivo:** Probar el flujo de "olvide contraseña"

### Paso 1a: Inicio de sesión
- [ ] Abre `https://makwin.vercel.app/login`
- [ ] Haz clic en **"¿Olvidaste tu contraseña?"** (si está visible en el login)
- **Esperado:** Debería haber un enlace o botón para resetear contraseña

### Paso 1b: Alternativa - Acceder directo
- [ ] Abre `https://makwin.vercel.app/reset-password` directamente
- **Esperado:** 
  - Página con título "Resetear Contraseña"
  - 2 campos: "Nueva Contraseña" y "Confirmar Contraseña"
  - Botón "Resetear Contraseña"

### Paso 1c: Validaciones
- [ ] Intenta enviar sin contraseñas → debería dar error
- [ ] Escribe contraseña muy corta (< 6 caracteres) → debería dar error
- [ ] Escribe contraseñas diferentes → debería dar error
- [ ] Escribe 2 contraseñas iguales (6+ caracteres) → debería funcionar

### Resultado esperado:
- ✅ Si funciona: Página carga, validaciones funcionan, botón está activo
- ❌ Si falla: Página no existe, errores en consola, botón no responde

**REPORTA:** ✅ / ❌ Funciona/No funciona?

---

## ✅ TEST 2: Configuración de Cuenta

**Objetivo:** Probar cambios de contraseña, emisión de email de reset, y eliminación de cuenta

### Paso 2a: Acceder a Configuración
- [ ] Iniciar sesión en `https://makwin.vercel.app/galeria` (si no estás logueado)
- [ ] Haz clic en tu **avatar** (arriba a la derecha)
- [ ] En el menú, busca **"Configuración"**
- **Esperado:** Deberías ver un link "Configuración" con icono de engranaje

### Paso 2b: Entrar a Configuración
- [ ] Haz clic en "Configuración"
- [ ] O abre directamente `https://makwin.vercel.app/configuracion`
- **Esperado:**
  - Página con varias secciones
  - Mostrar tu email
  - Sección "Cambiar Contraseña"
  - Sección "Resetear vía Email"
  - Sección "Zona de Peligro" (eliminar cuenta)

### Paso 2c: Cambiar Contraseña
- [ ] En "Cambiar Contraseña", ingresa una nueva contraseña (2 veces)
- [ ] Haz clic en "Cambiar Contraseña"
- **Esperado:**
  - Mensaje de éxito verde
  - Los campos se limpian
  - Luego puedes cerrar sesión e intentar login con la nueva contraseña

### Paso 2d: Enviar Email de Reset
- [ ] En "Resetear vía Email", haz clic en "Enviar Email de Reset"
- **Esperado:**
  - Mensaje de éxito: "Email enviado a..."
  - Deberías recibir email (revisa spam también)

### Paso 2e: Cerrar Sesión
- [ ] Haz clic en "Cerrar Sesión"
- **Esperado:**
  - Sesión cierra
  - Rediriges a home `/`

### Paso 2f: Eliminar Cuenta (CUIDADO - no hacer si quieres mantener la cuenta)
- [ ] Baja hasta "Zona de Peligro"
- [ ] Haz clic en "Eliminar Cuenta"
- **Esperado:**
  - Confirmación con texto de advertencia
  - Botón "Cancelar" para arrepentirse
  - Si confirmas: cuenta eliminada irreversiblemente

**REPORTA:** ✅ / ❌ Dónde funciona/no funciona?

---

## ✅ TEST 3: Feed de Siguiendo

**Objetivo:** Probar que el feed muestra solo obras de autores que sigues

### Paso 3a: Preparación
- [ ] Inicia sesión en `https://makwin.vercel.app/galeria`
- [ ] Busca un artista en la galería
- [ ] Haz clic en su usuario
- [ ] Si no hay botón "Seguir" o "Siguiendo", entonces no está implementado el follow

### Paso 3b: Seguir a alguien
- [ ] Ve a `/u/[username]` de un artista (por ejemplo `/u/aleix`)
- [ ] Deberías ver un botón "Seguir" o "Siguiendo"
- [ ] Haz clic para seguir a esta persona
- [ ] El botón debería cambiar a "Siguiendo"

### Paso 3c: Acceder al feed de Siguiendo
- [ ] En el menú de usuario (avatar), busca **"Siguiendo"**
- [ ] O abre directamente `https://makwin.vercel.app/siguiendo`
- **Esperado:**
  - Página carga con título "Siguiendo"
  - Muestra obras solo de los autores que sigues
  - Si no sigues a nadie: mensaje "No hay contenido"

### Paso 3d: Infinite scroll
- [ ] Baja la página
- **Esperado:**
  - Obras cargan automáticamente cuando llegas al final
  - No hay saltos o errores

**REPORTA:** ✅ / ❌ Feed funciona? Mostrar obras?

---

## ✅ TEST 4: WorkDetail Actualizado (Supabase)

**Objetivo:** Probar que la página de detalle de obra funciona con Supabase (no API antigua)

### Paso 4a: Abrir detalle de obra
- [ ] En la galería (`/galeria`), haz clic en una obra
- [ ] URL debería ser algo como `/work/[uuid]`
- **Esperado:**
  - Página carga correctamente
  - Muestra: titulo, autor, descripción, imagen/audio
  - No errores de "API antigua no encontrada"

### Paso 4b: Like / Unlike
- [ ] En la página de detalle, busca botón ❤️ (like)
- [ ] Haz clic en él (sin estar logueado debería pedir login)
- [ ] Botón debería llenarse de rojo
- [ ] Contador de likes aumenta
- [ ] Haz clic nuevamente → se quita el like

**Esperado:**
- Like se guarda en Supabase
- Al recargar (F5), el like se mantiene

### Paso 4c: Guardar / Unsave
- [ ] Busca botón 🔖 (bookmark/guardar)
- [ ] Haz clic para añadir a guardados
- [ ] Botón debería llenar/cambiar
- [ ] Haz clic nuevamente para quitar

**Esperado:**
- Guardado se sincroniza
- Al ir a `/favoritos`, la obra debería estar listada

### Paso 4d: Audio Player (si es música)
- [ ] Si la obra es una canción, debería haber audio player
- [ ] Botones play/pausa deberían funcionar
- [ ] Barra de progreso funciona
- [ ] Tiempo actual se actualiza

**REPORTA:** ✅ / ❌ Cada sección funciona?

---

## ✅ TEST 5: Botón Report (Reportar Obra)

**Objetivo:** Probar que puedes reportar obras inapropiadas

### Paso 5a: Report en galería
- [ ] En la galería (`/galeria`), busca una tarjeta de obra
- [ ] Abajo a la derecha, busca pequeño icono 🚩 (bandera)
- **Esperado:** Debería haber un botón pequeño de bandera

### Paso 5b: Hacer report
- [ ] Haz clic en el icono 🚩
- [ ] Si no estás logueado → debería pedir login
- [ ] Si estás logueado → debería abrir prompt con pregunta "¿Por qué reportas esta obra?"
- [ ] Escribe una razón (ej: "Contenido inapropiado")
- [ ] Presiona OK

**Esperado:**
- Mensaje: "Reporte enviado. Gracias por ayudarnos..."
- Reporte se guarda en tabla `reports` de Supabase

### Paso 5c: Report en detalle de obra
- [ ] Abre una obra con `/work/[id]`
- [ ] Busca botón 🚩 (debajo del título o junto a likes)
- [ ] Repite el proceso
- **Esperado:** Funciona igual que en galería

**REPORTA:** ✅ / ❌ Report aparece? Funciona el prompt?

---

## ✅ TEST 6: Links en Menú de Usuario

**Objetivo:** Verificar que todos los nuevos links aparecen en el menú

### Paso 6a: Abrir menú de usuario
- [ ] Inicia sesión
- [ ] Haz clic en tu avatar (arriba a la derecha)
- **Esperado:** Menú desplegable con opciones

### Paso 6b: Verificar links
- [ ] Debería haber:
  - ✅ "Mi perfil"
  - ✅ "Guardados"
  - ✅ "**Siguiendo**" (NUEVO)
  - ✅ "Subir obra"
  - ✅ "**Configuración**" (NUEVO)
  - ✅ "Cerrar sesión"

- **Esperado:** Todos los links están presentes y funcionan

**REPORTA:** ✅ / ❌ Links presentes? Navegan correctamente?

---

## ✅ TEST 7: Rutas SPA en Vercel

**Objetivo:** Probar que las rutas funcionan sin 404

### Paso 7a: Recarga (F5) en nuevas rutas
- [ ] En `/reset-password` → presiona F5 → debería cargar sin 404
- [ ] En `/configuracion` → presiona F5 → debería cargar sin 404
- [ ] En `/siguiendo` → presiona F5 → debería cargar sin 404

**Esperado:**
- Página sigue visible
- No error 404
- Estado de usuario se recupera (si estaba logueado)

### Paso 7b: Navegación directa
- [ ] En navegador, ve directamente a:
  - `https://makwin.vercel.app/reset-password`
  - `https://makwin.vercel.app/configuracion`
  - `https://makwin.vercel.app/siguiendo`

**Esperado:** Todas cargan correctamente

**REPORTA:** ✅ / ❌ F5 causa 404? URLs directas funcionan?

---

## 📊 RESUMEN DE REPORTE

Copia y pega esto, completando cada sección:

```
## REPORTE DE TESTING - 1 de Abril 2026

### TEST 1: Reset Password
- Página `/reset-password`: ✅ / ❌
- Validaciones: ✅ / ❌
- Nota: [describe problemas si hay]

### TEST 2: Configuración
- Página `/configuracion`: ✅ / ❌
- Cambiar contraseña: ✅ / ❌
- Email de reset: ✅ / ❌
- Cerrar sesión: ✅ / ❌
- Eliminar cuenta: ✅ / ❌
- Nota: [describe problemas si hay]

### TEST 3: Feed Siguiendo
- Página `/siguiendo`: ✅ / ❌
- Mostrar obras de seguidos: ✅ / ❌
- Infinite scroll: ✅ / ❌
- Nota: [describe problemas si hay]

### TEST 4: WorkDetail
- Carga correctamente: ✅ / ❌
- Like funciona: ✅ / ❌
- Save funciona: ✅ / ❌
- Audio player: ✅ / ❌ (si aplica)
- Nota: [describe problemas si hay]

### TEST 5: Report
- Botón aparece: ✅ / ❌
- Prompt abre: ✅ / ❌
- Reporte se envía: ✅ / ❌
- Nota: [describe problemas si hay]

### TEST 6: Menú
- Links aparecen: ✅ / ❌
- Links funcionan: ✅ / ❌
- Nota: [describe problemas si hay]

### TEST 7: SPA Routing
- F5 en nuevas rutas: ✅ / ❌
- URLs directas: ✅ / ❌
- Nota: [describe problemas si hay]

**ERRORES ENCONTRADOS:**
[Lista cualquier error o comportamiento inesperado]

**OBSERVACIONES GENERALES:**
[Cualquier otro comentario]
```

---

## 🔍 Si encuentras errores:

1. **Abre DevTools** (F12)
2. Pestaña **Console** → ¿hay errores rojos?
3. Pestaña **Network** → ¿hay peticiones fallidas (404, 500)?
4. **Cópiame el error completo**

---

**¡Listo para testear! Avísame cuando termines con el reporte.** 🚀
