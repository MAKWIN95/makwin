#!/usr/bin/env node
/**
 * scripts/run.js
 * Punto de entrada para todos los comandos
 * Uso: node scripts/run.js [manager] [comando] [args...]
 */

const path = require('path');

function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     MAKWIN AUTOMATION SCRIPTS - COMMAND CENTER              ║
╚══════════════════════════════════════════════════════════════╝

GESTORES DISPONIBLES:

1. ENV MANAGER (Gestión de variables de entorno)
   node scripts/run.js env [comando]
   
   Comandos:
   - show                Mostrar todas las variables
   - test                Verificar que estén todas

2. SUPABASE MANAGER (Gestión de base de datos)
   node scripts/run.js supabase [comando]

   Comandos:
   - check              Verificar conexión
   - list-users [N]     Listar N primeros usuarios (default: 10)
   - find-user <email>  Buscar usuario por email
   - export <tabla> <archivo>  Exportar tabla a JSON
   - rpc <func> [params]       Ejecutar función RPC

3. VERCEL MANAGER (Gestión de despliegues)
   node scripts/run.js vercel [comando]

   Comandos:
   - project            Ver info del proyecto
   - env                 Ver variables de entorno
   - set-env <K> <V>    Establecer variable
   - sync-supabase      Sincronizar vars de Supabase
   - sync-google        Sincronizar vars de Google
   - deploys [N]        Ver últimos N deploys

EJEMPLOS:

  # Ver variables locales
  node scripts/run.js env show

  # Verificar conexión a Supabase
  node scripts/run.js supabase check

  # Sincronizar variables a Vercel
  node scripts/run.js vercel sync-supabase

  # Ver info del proyecto en Vercel
  node scripts/run.js vercel project

═════════════════════════════════════════════════════════════════
  `);
}

async function main() {
  const args = process.argv.slice(2);
  const manager = args[0];
  const command = args[1];

  if (!manager || manager === '--help' || manager === 'help') {
    showHelp();
    return;
  }

  try {
    let managerClass;

    switch (manager) {
      case 'env':
        managerClass = require('./env-manager.cjs');
        const envMgr = new managerClass();
        if (command === 'show') {
          envMgr.print();
        } else if (command === 'test') {
          envMgr.validate([
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_KEY',
            'VERCEL_TOKEN',
            'VERCEL_PROJECT_ID',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'GOOGLE_PROJECT_ID',
          ]);
        } else {
          showHelp();
        }
        break;

      case 'supabase':
        managerClass = require('./supabase-cmd');
        const supaMgr = new managerClass();
        // Pasar los argumentos restantes
        process.argv = [process.argv[0], process.argv[1], ...args.slice(1)];
        require('./supabase-cmd');
        return;

      case 'vercel':
        // Pasar los argumentos restantes
        process.argv = [process.argv[0], process.argv[1], ...args.slice(1)];
        require('./vercel-cmd');
        return;

      default:
        console.error(`❌ Gestor desconocido: ${manager}`);
        console.log('\nUsa: node scripts/run.js help');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
