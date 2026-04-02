# MAKWIN - Guía Completa de Testing

## Configuración Pre-Testing

### Entorno
- **URL**: https://makwin.vercel.app (o localhost:3002 para desarrollo)
- **Navegadores**: Prueba en múltiples navegadores (Chrome, Firefox, Safari, Edge)
- **Dispositivos**: Desktop, tablet y móvil
- **Red**: Prueba con throttling de 3G habilitado
- **Hora**: Asegúrate de que el reloj del sistema sea correcto para pruebas basadas en fechas

### Cuentas de Prueba
Crea estas cuentas de prueba antes de empezar:
- **Cuenta 1**: email@test.com / TestPass123
- **Cuenta 2**: second@test.com / SecondPass123  
- **Cuenta Google**: Cualquier cuenta Google válida

---

## ✅ Suite de Pruebas

### SECCIÓN 1: Autenticación y Flujos de Auth

#### Prueba 1a - Registro por Email (Válido)
**Pasos:**
1. Ve a `/registro`
2. Ingresa: Nombre: "Usuario Prueba", Usuario: "usuario_prueba.123", Email: "valido@test.com", Contraseña: "TestPass123", Confirmar: "TestPass123"
3. Haz clic en "Crear cuenta"
4. **Esperado**: Se envía email de confirmación, aparece página de éxito

#### Prueba 1b - Registro por Email (Email Duplicado - Validación en Tiempo Real)
**Pasos:**
1. Ve a `/registro`
2. Ingresa email existente (ej: existente@test.com)
3. **Esperado**: Aparece error naranja: "Este correo ya tiene una cuenta registrada"
4. El botón enviar debe estar deshabilitado

#### Prueba 1c - Registro por Email (Formato de Usuario Inválido)
**Pasos:**
1. Ve a `/registro`
2. Usuario: ".invalido" (comienza con punto)
3. **Esperado**: Error: "El nombre de usuario solo puede contener letras, números, puntos y guion bajo"

#### Prueba 1d - Registro por Email (Usuario Muy Corto)
**Pasos:**
1. Ve a `/registro`
2. Usuario: "ab"
3. **Esperado**: Se muestra error durante validación

#### Prueba 1e - Login por Email (Credenciales Correctas)
**Pasos:**
1. Ve a `/login`
2. Ingresa email/contraseña válidos
3. Haz clic en "Entrar"
4. **Esperado**: Redirige a `/galeria`, autenticado

#### Prueba 1f - Login por Email (Contraseña Incorrecta)
**Pasos:**
1. Ve a `/login`
2. Ingresa email válido + contraseña incorrecta
3. **Esperado**: Error: "Contraseña incorrecta"

#### Prueba 1g - Login por Email (Email No Existe)
**Pasos:**
1. Ve a `/login`
2. Ingresa email inexistente
3. **Esperado**: Error: "Este correo no está registrado"

#### Prueba 1h - Google Auth (Primer Login - Sin Usuario)
**Pasos:**
1. Ve a `/login`
2. Haz clic en "Continuar con Google"
3. Completa el sign-in con Google
4. **Esperado**: Aparece GoogleSignupModal pidiendo usuario/contraseña
5. Ingresa usuario válido y contraseña
6. **Esperado**: Redirige a `/galeria` con cuenta creada

#### Prueba 1i - Restablecer Contraseña (Email Válido)
**Pasos:**
1. Ve a `/login` → Haz clic en "¿Olvidaste tu contraseña?"
2. Ingresa email registrado
3. Haz clic en "Enviar enlace"
4. **Esperado**: Mensaje de éxito: "Revisa tu bandeja de entrada"

#### Prueba 1j - Restablecer Contraseña (Email No Existe)
**Pasos:**
1. Ve a página de restablecer contraseña
2. Ingresa email inexistente
3. **Esperado**: Manejo elegante (sin error mostrado por seguridad)

---

### SECCIÓN 2: Gestión de Perfil

#### Prueba 2a - Editar Perfil (Nombre Mostrado)
**Pasos:**
1. Inicia sesión y ve a `/u/tunombre`
2. Haz clic en "Editar perfil"
3. Cambia el nombre mostrado
4. Haz clic en "Guardar"
5. **Esperado**: Perfil actualizado, aparece mensaje

#### Prueba 2b - Editar Perfil (Agregar Biografía)
**Pasos:**
1. En modo edición, agrega texto de biografía
2. Guarda
3. **Esperado**: Biografía visible en el perfil

#### Prueba 2c - Editar Perfil (Agregar Sitio Web)
**Pasos:**
1. En modo edición, agrega "https://ejemplo.com"
2. Guarda
3. **Esperado**: Link del sitio web aparece con ícono, es clickeable

#### Prueba 2d - Editar Perfil (Sitio Web sin https)
**Pasos:**
1. Ingresa "ejemplo.com" (sin https)
2. Guarda y ve el perfil
3. **Esperado**: Link abre a https://ejemplo.com (prefijo automático)

#### Prueba 2e - Editar Perfil (Agregar Instagram)
**Pasos:**
1. En modo edición, agrega URL de Instagram
2. Guarda
3. **Esperado**: Link de Instagram aparece con ícono emoji

#### Prueba 2f - Editar Perfil (Agregar TikTok)
**Pasos:**
1. En modo edición, agrega URL de TikTok
2. Guarda
3. **Esperado**: Link de TikTok aparece con ícono emoji

#### Prueba 2g - Banner de Redes Sociales (Usuario Nuevo)
**Pasos:**
1. Crea cuenta nueva
2. Ve a tu perfil
3. **Esperado**: Banner azul: "🎵 Agrega tus redes sociales"
4. Haz clic en link del banner
5. **Esperado**: Abre modo edición

#### Prueba 2h - Subir Avatar
**Pasos:**
1. Haz clic en ícono de cámara en avatar
2. Selecciona archivo de imagen
3. **Esperado**: Avatar se sube y se muestra

#### Prueba 2i - Seguir Usuario
**Pasos:**
1. Ve a perfil de otro usuario
2. Haz clic en "Seguir"
3. **Esperado**: Botón cambia a "Siguiendo", contador de seguidores aumenta

#### Prueba 2j - Dejar de Seguir Usuario
**Pasos:**
1. Haz clic en "Siguiendo" en usuario seguido
2. **Esperado**: Botón cambia de vuelta a "Seguir", contador disminuye

---

### SECCIÓN 3: Subida y Gestión de Obras

#### Prueba 3a - Subir Pintura
**Pasos:**
1. Ve a `/subir-obra`
2. Selecciona "Pintura" como tipo
3. Rellena: Título, Descripción, sube imagen
4. Haz clic en "Publicar obra"
5. **Esperado**: Obra publicada, redirige a detalle de obra

#### Prueba 3b - Subir Canción con Letras
**Pasos:**
1. Ve a `/subir-obra`
2. Selecciona "Canción"
3. Sube archivo de audio
4. Agrega letras
5. Publica
6. **Esperado**: Canción aparece en galería con botón de reproducción

#### Prueba 3c - Subir Poema con Portada
**Pasos:**
1. Selecciona "Poema"
2. Agrega imagen de portada (checkbox opcional)
3. Publica
4. **Esperado**: Poema se muestra con portada en galería

#### Prueba 3d - Editar Obra
**Pasos:**
1. Ve tu obra
2. Haz clic en ícono de lápiz
3. Cambia título/descripción
4. Haz clic en "Guardar cambios"
5. **Esperado**: Cambios guardados, se muestran inmediatamente

#### Prueba 3e - Eliminar Obra
**Pasos:**
1. Haz clic en ícono de papelera en tu obra
2. Confirma eliminación
3. **Esperado**: Obra removida del perfil/galería

---

### SECCIÓN 4: Galería y Navegación

#### Prueba 4a - La Galería Carga
**Pasos:**
1. Ve a `/galeria`
2. Espera a que el contenido cargue
3. **Esperado**: Las obras se muestran en grid de masonería

#### Prueba 4b - Filtrar por Tipo de Obra
**Pasos:**
1. Haz clic en ícono de filtro
2. Selecciona "Canción"
3. **Esperado**: Grid muestra solo canciones

#### Prueba 4c - Ordenar por Recientes
**Pasos:**
1. Haz clic en "Más recientes"
2. **Esperado**: Obras ordenadas por fecha de creación (más nuevas primero)

#### Prueba 4d - Ordenar por Antiguas
**Pasos:**
1. Haz clic en "Más antiguas"
2. **Esperado**: Obras ordenadas por más antiguas primero

#### Prueba 4e - Botón Atrás desde Galería
**Pasos:**
1. Ve a `/galeria`
2. Haz clic en flecha atrás
3. **Esperado**: Navega a `/` (inicio), no a 404

#### Prueba 4f - Buscar Obras
**Pasos:**
1. Escribe término de búsqueda en header
2. **Esperado**: Los resultados se filtran en tiempo real

#### Prueba 4g - Paginación/Scroll Infinito
**Pasos:**
1. Desplázate al fondo de la galería
2. **Esperado**: Más obras cargan automáticamente

---

### SECCIÓN 5: Modales e Interacciones

#### Prueba 5a - Dar Like a Obra (Autenticado)
**Pasos:**
1. Inicia sesión y ve una obra
2. Haz clic en ícono de corazón
3. **Esperado**: Corazón se rellena, contador de likes aumenta (con animación)

#### Prueba 5b - Guardar Obra
**Pasos:**
1. Haz clic en ícono de marcador
2. **Esperado**: Marcador se rellena, retroalimentación visual

#### Prueba 5c - Reportar Obra (Modal)
**Pasos:**
1. Haz clic en ícono de bandera en obra
2. Selecciona razón (ej: "Contenido inapropiado")
3. Haz clic en "Enviar reporte"
4. **Esperado**: Modal muestra mensaje de éxito

#### Prueba 5d - Modal de Auth (Like sin Login)
**Pasos:**
1. Cierra sesión
2. Intenta dar like a una obra
3. **Esperado**: Modal aparece pidiendo iniciar sesión

#### Prueba 5e - Cerrar Modal (Click en Fondo)
**Pasos:**
1. Abre cualquier modal
2. Haz clic fuera del modal (en fondo oscuro)
3. **Esperado**: Modal se cierra

#### Prueba 5f - Cerrar Modal (Tecla ESC)
**Pasos:**
1. Abre modal
2. Presiona ESC
3. **Esperado**: Modal se cierra

---

### SECCIÓN 6: Obras Guardadas y Favoritos

#### Prueba 6a - Guardar Obra
**Pasos:**
1. Haz clic en marcador de obra
2. Ve a `/favoritos`
3. **Esperado**: Obra guardada aparece en lista

#### Prueba 6b - Ver Obras Guardadas
**Pasos:**
1. Ve a `/favoritos`
2. **Esperado**: Grid muestra todas las obras guardadas con nombres de autores correctos

#### Prueba 6c - Remover de Guardadas
**Pasos:**
1. Haz clic en marcador de nuevo para desguardar
2. **Esperado**: Obra desaparece de `/favoritos`

#### Prueba 6d - Mostrar Autor en Guardadas
**Pasos:**
1. Guarda obra de usuario "nombre_artista"
2. Ve a obras guardadas
3. **Esperado**: Autor muestra como "@nombre_artista", no solo "@"

---

### SECCIÓN 7: Internacionalización

#### Prueba 7a - Cambiar a Inglés
**Pasos:**
1. Inicia sesión
2. En header, encuentra selector de idioma
3. Elige "English"
4. **Esperado**: Todo el texto de UI cambia a inglés
5. Recarga página
6. **Esperado**: Idioma persiste

#### Prueba 7b - Cambiar a Español
**Pasos:**
1. Selector de idioma
2. Elige "Español"
3. **Esperado**: Todo se traduce al español

#### Prueba 7c - Preferencia de Idioma de Usuario Nuevo
**Pasos:**
1. Crea cuenta mientras está en inglés
2. Completa registro
3. **Esperado**: Interfaz se mantiene en inglés

#### Prueba 7d - Errores de Auth (Localizados)
**Pasos:**
1. Intenta login inválido en inglés
2. **Esperado**: Mensaje de error en inglés
3. Cambia a español
4. **Esperado**: Mensaje de error en español

---

### SECCIÓN 8: Diseño Responsivo

#### Prueba 8a - Layout Móvil (Retrato)
**Pasos:**
1. Abre en teléfono móvil (375px ancho)
2. Navega galería
3. **Esperado**: Obras se apilan verticalmente, legible

#### Prueba 8b - Layout Tablet
**Pasos:**
1. Abre en tablet (768px ancho)
2. **Esperado**: Layout se adapta apropiadamente

#### Prueba 8c - Perfil Móvil
**Pasos:**
1. Ve a perfil en móvil
2. **Esperado**: Avatar e info centrados, accesibles

#### Prueba 8d - Subida Móvil
**Pasos:**
1. Ve a `/subir-obra` en móvil
2. Rellena formulario
3. **Esperado**: Formulario legible, botones clickeables

---

### SECCIÓN 9: Manejo de Errores

#### Prueba 9a - Error de Red (Obras)
**Pasos:**
1. Apaga la red
2. Intenta cargar galería
3. **Esperado**: Error elegante o estado de carga
4. Enciende la red
5. **Esperado**: Contenido carga

#### Prueba 9b - URL Inválida
**Pasos:**
1. Navega a `/ruta-invalida`
2. **Esperado**: Página 404 aparece con link a inicio

#### Prueba 9c - Carga Lenta (3G)
**Pasos:**
1. Habilita throttling de 3G
2. Carga galería
3. **Esperado**: Contenido carga progresivamente, sin estado en blanco

#### Prueba 9d - Archivo Grande Cargado
**Pasos:**
1. Intenta subir archivo mayor al límite (>50MB)
2. **Esperado**: Error de validación antes de subir

---

### SECCIÓN 10: Rendimiento

#### Prueba 10a - Tiempo de Carga de Galería
**Pasos:**
1. Abre DevTools
2. Ve a `/galeria`
3. **Esperado**: Página totalmente interactiva en 3 segundos

#### Prueba 10b - Carga Perezosa de Imágenes
**Pasos:**
1. Abre pestaña de Red de DevTools
2. Desplázate por galería
3. **Esperado**: Imágenes cargan solo al entrar en vista

#### Prueba 10c - Tiempo de Apertura de Modal
**Pasos:**
1. Haz clic para abrir modal
2. **Esperado**: Modal aparece al instante (< 200ms)

#### Prueba 10d - Rendimiento de Cambio de Tema
**Pasos:**
1. Haz clic en bombilla de tema
2. **Esperado**: Tema cambia al instante
3. **Esperado**: Sin cambio de layout (CLS)

---

## 📋 Resumen del Checklist de Testing

| Categoría | Tests | Estado |
|-----------|-------|--------|
| Autenticación | 10 | ☐ |
| Gestión de Perfil | 10 | ☐ |
| Gestión de Obras | 5 | ☐ |
| Galería y Navegación | 7 | ☐ |
| Modales e Interacciones | 6 | ☐ |
| Obras Guardadas | 4 | ☐ |
| i18n | 4 | ☐ |
| Diseño Responsivo | 4 | ☐ |
| Manejo de Errores | 4 | ☐ |
| Rendimiento | 4 | ☐ |
| **TOTAL** | **58** | ☐ |

## 🐛 Template para Reportar Bugs

Cuando encuentres bugs, documéntalos así:

```markdown
### Bug: [Título Corto]
- **Pasos para Reproducir**: 
  1. Paso 1
  2. Paso 2
- **Esperado**: 
- **Actual**: 
- **Dispositivo**: 
- **Navegador**: 
- **Screenshot**: 
```

## ✅ Firma de Aprobación

**Probador**: ________________
**Fecha**: ________________
**Estado**: ☐ Todos Aprobados ☐ Con Problemas
**Problemas Encontrados**: ________

---

## 🚀 Preparación para Deploy a Producción

Antes de desplegar a producción, asegúrate de:
- [ ] Todos los 58 tests aprobados
- [ ] Sin bugs críticos restantes
- [ ] Métricas de rendimiento aceptables
- [ ] Entorno staging completamente testeado
- [ ] Migraciones de base de datos aplicadas
- [ ] Variables de entorno configuradas
- [ ] Backup creado
- [ ] Plan de rollback documentado
