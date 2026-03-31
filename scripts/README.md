# 🚀 MAKWIN Automation Scripts

Scripts de automatización para gestionar Supabase, Vercel y Google Cloud desde terminal.

## ✅ Requisitos

- Node.js instalado
- `.secrets.local` configurado con tus credenciales (gitignored)
- Dependencias instaladas: `pnpm install dotenv`

## 📁 Estructura

```
scripts/
├── env-manager.js      # Gestiona variables de entorno
├── supabase-cmd.js     # Comandos para Supabase
├── vercel-cmd.js       # Comandos para Vercel
├── run.js              # Punto de entrada centralizado
└── README.md           # Este archivo
```

## 🎯 Uso Rápido

### Ver todas las variables cargadas
```bash
node scripts/run.js env show
```

### Verificar conexión a Supabase
```bash
node scripts/run.js supabase check
```

### Listar usuarios en Supabase
```bash
node scripts/run.js supabase list-users 20
```

### Ver información del proyecto en Vercel
```bash
node scripts/run.js vercel project
```

### Sincronizar variables de Supabase a Vercel
```bash
node scripts/run.js vercel sync-supabase
```

### Ver últimos deploys
```bash
node scripts/run.js vercel deploys 10
```

---

## 📖 Comandos Detallados

### ENV MANAGER

Gestiona variables locales desde `.secrets.local`

```bash
# Mostrar todas las variables (enmascaradas por seguridad)
node scripts/run.js env show

# Validar que todas las variables requeridas existan
node scripts/run.js env test
```

### SUPABASE MANAGER

Gestiona base de datos, usuarios y consultas en Supabase

```bash
# Verificar conexión
node scripts/run.js supabase check

# Listar primeros 10 usuarios
node scripts/run.js supabase list-users

# Listar primeros 50 usuarios
node scripts/run.js supabase list-users 50

# Buscar usuario por email
node scripts/run.js supabase find-user "usuario@example.com"

# Exportar tabla a JSON
node scripts/run.js supabase export profiles backup-profiles.json
node scripts/run.js supabase export works backup-works.json

# Ejecutar función RPC
node scripts/run.js supabase rpc get_feed '{"limit":10,"offset":0}'
```

### VERCEL MANAGER

Gestiona proyecto, variables y deploys en Vercel

```bash
# Ver información del proyecto
node scripts/run.js vercel project

# Ver todas las variables de entorno
node scripts/run.js vercel env

# Establecer una variable
node scripts/run.js vercel set-env "VITE_SUPABASE_URL" "https://..."

# Sincronizar variables de Supabase desde .secrets.local
node scripts/run.js vercel sync-supabase

# Sincronizar variables de Google desde .secrets.local
node scripts/run.js vercel sync-google

# Ver últimos 5 deploys
node scripts/run.js vercel deploys

# Ver últimos 20 deploys
node scripts/run.js vercel deploys 20
```

---

## 🔐 Seguridad

- ✅ `.secrets.local` está en `.gitignore` (nunca sube a GitHub)
- ✅ Las credenciales se cargan solo en memoria (no se guardan)
- ✅ En salida, se enmascaran valores para evitar exposición accidental
- ✅ Solo el archivo `.secrets.local` local contiene datos sensibles

## 🚨 Troubleshooting

### Error: "Archivo .secrets.local no encontrado"
Crea el archivo `.secrets.local` en la raíz del proyecto con tus credenciales:

```env
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
VERCEL_TOKEN=...
VERCEL_PROJECT_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_PROJECT_ID=...
```

### Error: "Variables faltantes"
Ejecuta:
```bash
node scripts/run.js env test
```
Ver qué variables faltan y añadirlas a `.secrets.local`

### Los cambios en Vercel no se aplican
Vercel puede tardar algunos minutos. Espera un poco y luego:
```bash
node scripts/run.js vercel deploys
```

---

## 📚 Ejemplos de flujos completos

### Flujo 1: Sincronizar todo a Vercel
```bash
# 1. Verificar que todo esté bien localmente
node scripts/run.js env test
node scripts/run.js supabase check

# 2. Sincronizar variables
node scripts/run.js vercel sync-supabase
node scripts/run.js vercel sync-google

# 3. Verificar
node scripts/run.js vercel env

# 4. Ver info del deploy
node scripts/run.js vercel project
```

### Flujo 2: Backup de usuarios
```bash
# Exportar datos
node scripts/run.js supabase export profiles backup-$(date +%Y%m%d-%H%M%S)-profiles.json
node scripts/run.js supabase export works backup-$(date +%Y%m%d-%H%M%S)-works.json

# Los archivos se guardan en la raíz del proyecto
```

### Flujo 3: Debugging
```bash
# 1. Ver qué variables hay
node scripts/run.js env show

# 2. Conectar a Supabase
node scripts/run.js supabase check

# 3. Ver primer usuario
node scripts/run.js supabase list-users 1

# 4. Ver ambiente de Vercel
node scripts/run.js vercel env
node scripts/run.js vercel project
```

---

## 📝 Notas

- Los comandos asumen que `.secrets.local` está bien configurado
- Todos los métodos detectan errores y te muestran mensajes claros
- Puedes combinar comandos en scripts bash

## ❓ Ayuda

```bash
node scripts/run.js help
node scripts/run.js [manager] help
```

---

**Autor:** Automation Scripts para MAKWIN  
**Última actualización:** Marzo 2026
