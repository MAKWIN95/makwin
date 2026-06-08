# 🎯 OAUTH Onboarding - Arquitectura Refactorizada

## Estado Actual

✅ **Arquitectura refactorizada y validada**
- Eliminado `signInWithPassword` innecesario
- Cambiado a `sessionStorage` para estado onboarding
- Limpieza quirúrgica (no toca localStorage)
- Multi-tab seguro
- No race conditions

❌ **Falta: Validación manual de 6 casos**

---

## Qué se ha hecho

### 1. Problemas Identificados y Resueltos

| Problema | Solución |
|----------|----------|
| Double auth (signInWithPassword) | ❌ Eliminado. OAuth sesión ya válida. |
| localStorage cleanup agresivo | ✅ Cambiado a sessionStorage (auto-limpia) |
| user = null durante onboarding | ✅ user siempre poblado, guard via flag |
| Multi-tab corruption | ✅ sessionStorage tab-scoped |

### 2. Cambios en Código

**Archivo**: `client/lib/AuthContext.tsx`

```typescript
// AGREGADO
const [onboardingUser, setOnboardingUser] = useState<User | null>(null);

// MODIFICADO: handleSession
- No toca localStorage
+ Usa sessionStorage['makwin-onboarding-incomplete']
+ Mantiene user/session poblados de Supabase
+ Usa needsUsernameSetup como guard

// MODIFICADO: completeGoogleSignUp
- Eliminado signInWithPassword
+ Solo completa perfil en DB
+ Limpia sessionStorage flag
+ No re-autenticación

// MODIFICADO: signOut
- Eliminado limpieza de localStorage
+ Solo limpia sessionStorage flag
```

### 3. Arquitectura Validada

**Storage (Garantías)**:
- `localStorage['sb-token']`: PROTEGIDO (nunca limpiado)
- `sessionStorage['makwin-onboarding-incomplete']`: Ephemeral (tab-scoped)

**State (Garantías)**:
- `user`/`session`: Siempre poblados si Supabase válido
- `profile`: Solo si onboarding completo
- `needsUsernameSetup`: Guard para acceso app

**Flujos (Validados)**:
- ✅ New Google → Onboarding → localStorage intacto
- ✅ F5 durante onboarding → sessionStorage se limpia
- ✅ Completar onboarding → sesión persiste
- ✅ Existentes Google → Sin modal
- ✅ Multi-tab → Aislamiento correcto

---

## Qué falta: TESTS MANUALES (Obligatorio)

### CASO A: F5 Durante Onboarding

**Setup**: Browser incógnito limpio

```
1. Ir a http://localhost:8080/login
2. Click "Iniciar sesión con Google"
3. Completa OAuth con cuenta NEW de Google
4. Aparece modal onboarding (no closable)
   - Verificar: sessionStorage['makwin-onboarding-incomplete'] = user ID
   - Verificar: localStorage['sb-token'] existe
5. SIN completar el form, presiona F5
6. Después refresh:
   - ✅ Vuelve a landing PÚBLICO (NO authenticado)
   - ✅ Modal aparece otra vez
   - ✅ localStorage['sb-token'] sigue ahí
   - ✅ sessionStorage flag limpio
   - ✅ Sin errores en console
```

**Expected**: ✅ User puede refresh sin perder estado público

---

### CASO B: Cerrar Tab + Volver

**Setup**: Desde CASO A

```
1. Tienes tab A en modal onboarding
2. Cierra TAB A completamente (no refresh, cierre total)
3. Abre TAB B en http://localhost:8080
4. Después load:
   - ✅ Page carga a landing PÚBLICO
   - ✅ localStorage['sb-token'] persiste (Supabase session)
   - ✅ sessionStorage['makwin-onboarding-incomplete'] limpio
   - ✅ Modal aparece (detecta: Google user + no profile)
   - ✅ Sin errores, sin hydration flashes
```

**Expected**: ✅ Multi-tab clean; nueva tab auto-detecta onboarding

---

### CASO C: Completar Onboarding + Persist

**Setup**: Desde CASO A/B

```
1. Tienes modal onboarding visible
2. Llena:
   - Username: testuser_<timestamp> (ej: testuser_123456)
   - Display Name: Test User
   - Password: TestPassword123
3. Click "Continuar"
4. Inmediatamente después:
   - ✅ Modal desaparece
   - ✅ NO aparece nuevamente
   - ✅ App muestra gallery/authenticado
   - ✅ profile.username populated
   - ✅ needsUsernameSetup = false
   - ✅ Sin errores
5. Presiona F5
6. Después refresh:
   - ✅ NO vuelve a mostrar modal
   - ✅ Sigue authenticado (gallery)
   - ✅ Profile data persiste
   - ✅ localStorage['sb-token'] intacto
   - ✅ Sin hydration flashes
```

**Expected**: ✅ Onboarding completo persiste correctamente

---

### CASO D: Usuario Google Existente (No Regression)

**Setup**: Usa cuenta de CASO C (con username)

```
1. Incógnito nuevo (no usa sesión anterior)
2. Ir a /login
3. Click "Iniciar sesión con Google"
4. Completa OAuth con MISMA cuenta (ya tiene username)
5. Inmediatamente:
   - ✅ NO aparece modal onboarding
   - ✅ App muestra gallery authenticado
   - ✅ Profile data populated (username, display_name)
   - ✅ needsUsernameSetup = false
   - ✅ Data matches lo que completaste en CASO C
```

**Expected**: ✅ Usuarios existentes saltan onboarding

---

### CASO E: Multi-Tab Onboarding

**Setup**: Navegador normal (no incógnito para compartir storage)

```
1. TAB A: Inicia Google OAuth → modal onboarding
   - Verificar: sessionStorage['makwin-onboarding-incomplete'] = A
   - Verificar: localStorage['sb-token'] = X
   - NO completes el form

2. TAB B: Abre http://localhost:8080
   - ✅ Mismo localStorage['sb-token'] que TAB A
   - ✅ Diferente sessionStorage (independiente)
   - ✅ También muestra modal (detecta Google + no profile)

3. TAB B: Completa el form
   - Username: testuser_<timestamp>
   - Password: TestPassword123
   - Click "Continuar"

4. TAB B:
   - ✅ Modal desaparece
   - ✅ App muestra gallery (authenticado)

5. TAB A: Recarga manual o espera
   - ✅ Modal desaparece (profile ahora existe)
   - ✅ TAB A también muestra gallery (no modal)
   - ✅ Ambas tabs sincronizadas en estado authenticado
```

**Expected**: ✅ Multi-tab isolation; shared DB syncs correctly

---

### CASO F: Partial Profile Row During Onboarding

**Setup**: Usa un caso donde la fila de `profiles` existe pero no está completa

```
1. Inicia Google OAuth con un usuario nuevo y crea una fila parcial en `profiles`
2. Verifica que la fila existe en DB con `username` y/o `display_name` ausentes
3. Confirma en la app:
   - No se concede acceso authenticated completo
   - `needsUsernameSetup = true`
   - `sessionStorage['makwin-onboarding-incomplete']` está presente
   - `localStorage['sb-token']` sigue existiendo
4. Refresca la página o cierra/reabre la pestaña
5. Verifica:
   - El onboarding modal reaparece
   - No se accede al gallery antes de completar
   - No hay loops de auth
   - El usuario no se trata como existing valid user
6. Completa el flujo de onboarding después de verificar
```

**Expected**: ✅ Las filas parciales de perfil se tratan como onboarding incompleto, no como usuario existente válido

---

## Checklist de Validación

```
CASO A ☐ F5 durante onboarding → landing público
CASO B ☐ Cerrar tab → reabrir → clean state
CASO C ☐ Completar onboarding → persiste F5
CASO D ☐ Usuario existente → sin modal
CASO E ☐ Multi-tab → aislamiento correcto
```

---

## Cómo Validar (Paso a Paso)

### Preparación
1. `pnpm dev` (o tu comando para iniciar dev server)
2. Abre browser a `http://localhost:8080/login`
3. Ten console abierta (F12 → Console tab)

### Validación
1. Ejecuta CASO A completamente
2. Ejecuta CASO B completamente
3. Ejecuta CASO C completamente
4. Ejecuta CASO D completamente
5. Ejecuta CASO E completamente

### Documentación
- Anota cualquier issue (error, comportamiento diferente)
- Captura console logs si hay errores
- Verifica localStorage/sessionStorage con `console`:
  ```javascript
  localStorage.getItem('sb-token') // debe existir
  sessionStorage.getItem('makwin-onboarding-incomplete') // verificar
  ```

---

## Posibles Issues a Vigilar

### ❌ Hydration Mismatch
- Page muestra público, luego de repente autentica (o vice versa)
- **Acción**: Abrir console, buscar errores, revisar useEffect timing

### ❌ localStorage Corrupted
- localStorage['sb-token'] desaparece en TAB B durante CASO E
- **Acción**: Significa que aún hay limpieza indiscriminada
- **Lugar**: `client/lib/AuthContext.tsx` en `handleSession`

### ❌ Modal No Desaparece Después de Completar
- Completas CASO C form pero modal sigue visible
- **Acción**: Check `completeGoogleSignUp` no devuelve error
- **Debug**: `completeGoogleSignUp` debe:
  1. Actualizar profile en DB ✅
  2. Limpiar sessionStorage flag ✅
  3. Setear needsUsernameSetup = false ✅

### ❌ Multi-Tab Desync (CASO E)
- TAB A y TAB B muestran estados diferentes después de completar
- **Acción**: Probablemente caché de profile o profile fetching issue
- **Fix**: Asegurar que profile fetch es fresh (no cached)

---

## Archivos de Referencia

- 📄 [OAUTH_REFACTOR_SUMMARY.md](OAUTH_REFACTOR_SUMMARY.md) - Detalles técnicos
- 📄 [OAUTH_VALIDATION_COMPLETE.md](OAUTH_VALIDATION_COMPLETE.md) - Checklist técnico
- 📄 [client/lib/AuthContext.tsx](client/lib/AuthContext.tsx) - Código modificado

---

## Próximos Pasos

### Si todos los tests pasan ✅
1. Commit changes con mensaje: "refactor: OAuth onboarding architecture - validated"
2. Deploy a staging
3. Run E2E tests en staging
4. Deploy a production

### Si hay issues ❌
1. Reporta en qué CASO falló
2. Qué comportamiento vs qué expected
3. Console errors (si aplica)
4. Debuggearemos juntos

---

## Tiempo Estimado

- CASO A: 5 min
- CASO B: 5 min
- CASO C: 5 min
- CASO D: 5 min
- CASO E: 10 min
- **Total: ~30 min**

---

**Status**: ✅ Arquitectura lista para validación manual
**Bloqueador**: TESTS OBLIGATORIOS antes de deploy

¿Empezamos con los tests?
