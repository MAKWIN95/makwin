# 📋 Configuración de Variables de Entorno en Vercel

## Variables Requeridas

Para que el formulario de envío de obras funcione correctamente, necesitas configurar estas variables en Vercel:

### 1. Frontend (Cloudinary - Public)
```
VITE_CLOUDINARY_CLOUD_NAME=dkunicbam
VITE_CLOUDINARY_UPLOAD_PRESET=MAKWIN_UNSIGNED
```

### 2. Backend (Resend - Secret)
```
RESEND_API_KEY=re_g9t4QP2Q_9drgbqcNLHH39qGw1UxuXJK1
RECIPIENT_EMAIL=sendtomakwin@gmail.com
```

## 🔧 Pasos para Configurar en Vercel

1. Ve a https://vercel.com/makwins-projects/makwin
2. Haz clic en **Settings** (Configuración)
3. Ve a **Environment Variables**
4. Añade cada variable una por una:
   - Nombre: `VITE_CLOUDINARY_CLOUD_NAME`
   - Valor: `dkunicbam`
   - Haz clic en **Save**
5. Repite para cada variable
6. Una vez añadidas todas, despliega con: `vercel --prod`

## ✅ Verificación

Después de desplegar, prueba:
1. Ve a `/enviar-obra`
2. Completa el formulario con un archivo pequeño
3. Verifica que se sube sin errores

Si aún tienes problemas, comprueba que:
- `VITE_CLOUDINARY_CLOUD_NAME` sea exacto: `dkunicbam`
- `VITE_CLOUDINARY_UPLOAD_PRESET` sea exacto: `MAKWIN_UNSIGNED`
- El preset esté configurado como **unsigned** en Cloudinary
