# 🚀 Quick Start - Scripts Rápidos

Comandos más útiles para usar los scripts de automatización:

## ⚡ Uso Más Común

```bash
# Ver tus variables cargadas (enmascaradas)
node scripts/run.cjs env show

# Ver proyecto en Vercel
node scripts/vercel-cmd.cjs project

# Ver variables de entorno en Vercel
node scripts/vercel-cmd.cjs env

# Sincronizar Supabase vars a Vercel (una sola línea!)
node scripts/vercel-cmd.cjs sync-supabase

# Ver últimos deploys
node scripts/vercel-cmd.cjs deploys
```

## 📋 Ejemplos por Caso de Uso

### Caso 1: Cambiar variables en Vercel
```bash
# Opción A: Una por una
node scripts/vercel-cmd.cjs set-env "VITE_SUPABASE_URL" "https://..."

# Opción B: Todas de Supabase de una vez
node scripts/vercel-cmd.cjs sync-supabase
```

### Caso 2: Verificar que todo esté configurado
```bash
node scripts/run.cjs env test
```

### Caso 3: Backup de usuarios
```bash
node scripts/supabase-cmd.cjs export profiles backup-profiles-$(date +%Y%m%d).json
```

### Caso 4: Ver proyecto + último deploy
```bash
node scripts/vercel-cmd.cjs project && node scripts/vercel-cmd.cjs deploys 1
```

## 🔍 Debugging

Si algo falla:

1. Verifica que `.secrets.local` existe:
   ```bash
   dir .secrets.local
   ```

2. Verifica que tiene las variables correctas:
   ```bash
   node scripts/run.cjs env show
   ```

3. Prueba conexión a Vercel:
   ```bash
   node scripts/vercel-cmd.cjs project
   ```

4. Prueba conexión a Supabase:
   ```bash
   node scripts/supabase-cmd.cjs check
   ```

## 📝 Referencia Completa

Ver todos los comandos disponibles:
```bash
node scripts/run.cjs help
```

O en archivos específicos:
```bash
node scripts/vercel-cmd.cjs help
node scripts/supabase-cmd.cjs help
```

---

**Próxima vez, solo copia y pega el comando que necesites** ✨
