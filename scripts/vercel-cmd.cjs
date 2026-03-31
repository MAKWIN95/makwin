#!/usr/bin/env node
/**
 * vercel-cmd.js
 * Gestiona Vercel: variables de entorno, deploys, logs, etc.
 * Usa la Vercel API directamente
 * Uso: node scripts/vercel-cmd.js [comando] [args]
 */

const https = require('https');
const EnvManager = require('./env-manager.cjs');

class VercelManager {
  constructor() {
    try {
      this.env = new EnvManager();
      this.env.validate([
        'VERCEL_TOKEN',
        'VERCEL_PROJECT_ID'
      ]);

      this.token = this.env.get('VERCEL_TOKEN');
      this.projectId = this.env.get('VERCEL_PROJECT_ID');
      console.log('✅ Gestor de Vercel inicializado\n');
    } catch (error) {
      console.error('❌ Error inicializando Vercel:', error.message);
      process.exit(1);
    }
  }

  /**
   * Realiza una request HTTPS a Vercel API
   */
  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.vercel.com',
        path,
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(parsed.error?.message || `Error ${res.statusCode}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Obtiene las variables de entorno del proyecto
   */
  async getEnvVars() {
    console.log('📋 Obteniendo variables de entorno...\n');

    try {
      const response = await this.request('GET', `/v9/projects/${this.projectId}/env`);
      
      if (!response.envs) {
        console.log('✅ No hay variables de entorno definidas');
        return [];
      }

      console.log(`✅ Variables de entorno (${response.envs.length}):\n`);
      response.envs.forEach(env => {
        const value = env.value.substring(0, 15) + '...' + env.value.substring(env.value.length - 3);
        console.log(`  ${env.key}: ${value}`);
      });

      return response.envs;
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  /**
   * Establece una variable de entorno
   */
  async setEnvVar(key, value, target = ['production', 'preview', 'development']) {
    console.log(`🔧 Estableciendo ${key}...`);

    try {
      await this.request('POST', `/v10/projects/${this.projectId}/env`, {
        key,
        value,
        target,
        type: 'plain', // Required by Vercel API
      });

      console.log(`✅ Variable ${key} establecida correctamente\n`);
    } catch (error) {
      console.error(`❌ Error estableciendo ${key}:`, error.message);
    }
  }

  /**
   * Actualiza variables de una vez
   */
  async setMultipleEnvVars(vars) {
    console.log(`🔧 Estableciendo ${Object.keys(vars).length} variables...\n`);

    for (const [key, value] of Object.entries(vars)) {
      await this.setEnvVar(key, value);
    }

    console.log('✅ Todas las variables han sido establecidas\n');
  }

  /**
   * Obtiene información del proyecto
   */
  async getProject() {
    console.log('📦 Obteniendo información del proyecto...\n');

    try {
      const response = await this.request('GET', `/v9/projects/${this.projectId}`);

      console.log(`✅ Proyecto: ${response.name}`);
      console.log(`   ID: ${response.id}`);
      console.log(`   URL: https://${response.alias || response.name}.vercel.app`);
      console.log(`   Repositorio: ${response.link?.repo || 'N/A'}\n`);

      return response;
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  /**
   * Obtiene los últimos deploys
   */
  async listDeploys(limit = 5) {
    console.log(`📰 Últimos ${limit} deploys:\n`);

    try {
      const response = await this.request('GET', `/v6/deployments?projectId=${this.projectId}&limit=${limit}`);

      if (!response.deployments || response.deployments.length === 0) {
        console.log('No hay deploys');
        return;
      }

      response.deployments.forEach(deploy => {
        const status = deploy.status === 'READY' ? '✅' : deploy.status === 'ERROR' ? '❌' : '🔄';
        const date = new Date(deploy.created).toLocaleString('es-ES');
        const deployId = deploy.id ? deploy.id.substring(0, 8) + '...' : 'unknown';
        console.log(`${status} ${deployId} - ${date}`);
        console.log(`   URL: ${deploy.url || 'N/A'}`);
      });

      console.log('');
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  /**
   * Muestra el helper de comandos
   */
  showHelp() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          VERCEL COMMAND MANAGER                          ║
╚════════════════════════════════════════════════════════════╝

COMANDOS DISPONIBLES:

1. Ver proyecto:
   node scripts/vercel-cmd.js project

2. Ver variables de entorno:
   node scripts/vercel-cmd.js env

3. Establecer una variable:
   node scripts/vercel-cmd.js set-env <KEY> <VALUE>
   Ejemplo: node scripts/vercel-cmd.js set-env VITE_SUPABASE_URL "https://..."

4. Establecer variables de Supabase (desde .secrets.local):
   node scripts/vercel-cmd.js sync-supabase

5. Establecer variables de Google (desde .secrets.local):
   node scripts/vercel-cmd.js sync-google

6. Ver últimos deploys:
   node scripts/vercel-cmd.js deploys [limit=5]

7. Ver ayuda:
   node scripts/vercel-cmd.js help

═════════════════════════════════════════════════════════════
    `);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    const manager = new VercelManager();
    manager.showHelp();
    return;
  }

  const manager = new VercelManager();

  switch (command) {
    case 'project':
      await manager.getProject();
      break;

    case 'env':
      await manager.getEnvVars();
      break;

    case 'set-env':
      if (!args[1] || !args[2]) {
        console.error('❌ Debes especificar KEY y VALUE');
        console.log('Uso: node scripts/vercel-cmd.js set-env <KEY> <VALUE>');
        process.exit(1);
      }
      await manager.setEnvVar(args[1], args[2]);
      break;

    case 'sync-supabase':
      console.log('📤 Sincronizando variables de Supabase a Vercel...\n');
      await manager.setMultipleEnvVars({
        'VITE_SUPABASE_URL': manager.env.get('SUPABASE_URL'),
        'VITE_SUPABASE_ANON_KEY': manager.env.get('SUPABASE_ANON_KEY'),
      });
      break;

    case 'sync-google':
      console.log('📤 Sincronizando variables de Google Cloud a Vercel...\n');
      await manager.setMultipleEnvVars({
        'VITE_GOOGLE_CLIENT_ID': manager.env.get('GOOGLE_CLIENT_ID'),
        'GOOGLE_PROJECT_ID': manager.env.get('GOOGLE_PROJECT_ID'),
      });
      break;

    case 'deploys':
      const limit = parseInt(args[1]) || 5;
      await manager.listDeploys(limit);
      break;

    default:
      console.error(`❌ Comando desconocido: ${command}`);
      console.log('Usa: node scripts/vercel-cmd.js help');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = VercelManager;
