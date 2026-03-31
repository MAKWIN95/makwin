#!/usr/bin/env node
/**
 * supabase-cmd.js
 * Gestiona Supabase: ejecuta SQL, importa/exporta dados, etc.
 * Uso: node scripts/supabase-cmd.js [comando] [args]
 */

const { createClient } = require('@supabase/supabase-js');
const EnvManager = require('./env-manager.cjs');
const readline = require('readline');

class SupabaseManager {
  constructor() {
    try {
      this.env = new EnvManager();
      this.env.validate([
        'SUPABASE_URL',
        'SUPABASE_SERVICE_KEY'
      ]);

      this.supabase = createClient(
        this.env.get('SUPABASE_URL'),
        this.env.get('SUPABASE_SERVICE_KEY')
      );
      console.log('✅ Conectado a Supabase\n');
    } catch (error) {
      console.error('❌ Error conectando a Supabase:', error.message);
      process.exit(1);
    }
  }

  /**
   * Busca un usuario por email y muestra su información
   */
  async findUser(email) {
    console.log(`\n🔍 Buscando usuario: ${email}\n`);
    
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.log('❌ Usuario no encontrado');
        return null;
      }

      console.log('✅ Usuario encontrado:');
      console.table(data);
      return data;
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  /**
   * Lista todos los usuarios
   */
  async listUsers(limit = 10) {
    console.log(`\n👥 Listando primeros ${limit} usuarios:\n`);

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .limit(limit);

      if (error) throw error;

      if (data.length === 0) {
        console.log('No hay usuarios');
        return;
      }

      console.table(data);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  /**
   * Comprueba la conexión
   */
  async checkConnection() {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count(*)', { count: 'exact', head: true })
        .limit(1);

      if (error) throw error;
      console.log('✅ Conexión a Supabase OK\n');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
  }

  /**
   * Ejecuta un RPC (Remote Procedure Call)
   */
  async callRpc(functionName, params = {}) {
    console.log(`\n⚙️  Ejecutando RPC: ${functionName}`);
    console.log(`Parámetros:`, params);

    try {
      const { data, error } = await this.supabase.rpc(functionName, params);

      if (error) throw error;

      console.log('✅ Resultado:');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  /**
   * Exporta tablaPrincipal datos de una tabla
   */
  async exportTable(tableName, filename) {
    console.log(`\n📤 Exportando tabla ${tableName} a ${filename}...`);

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*');

      if (error) throw error;

      const fs = require('fs');
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`✅ Tabla exportada a ${filename} (${data.length} registros)`);
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
║          SUPABASE COMMAND MANAGER                         ║
╚════════════════════════════════════════════════════════════╝

COMANDOS DISPONIBLES:

1. Verificar conexión:
   node scripts/supabase-cmd.js check

2. Listar usuarios:
   node scripts/supabase-cmd.js list-users [limit=10]

3. Buscar usuario por email:
   node scripts/supabase-cmd.js find-user <email>

4. Exportar tabla:
   node scripts/supabase-cmd.js export <tabla> <archivo.json>
   Ejemplo: node scripts/supabase-cmd.js export profiles profiles.json

5. Llamar RPC:
   node scripts/supabase-cmd.js rpc <función> <json-params>
   Ejemplo: node scripts/supabase-cmd.js rpc get_feed '{"limit":10}'

6. Ver ayuda:
   node scripts/supabase-cmd.js help

═════════════════════════════════════════════════════════════
    `);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    const manager = new SupabaseManager();
    manager.showHelp();
    return;
  }

  const manager = new SupabaseManager();

  switch (command) {
    case 'check':
      await manager.checkConnection();
      break;

    case 'list-users':
      const limit = parseInt(args[1]) || 10;
      await manager.listUsers(limit);
      break;

    case 'find-user':
      if (!args[1]) {
        console.error('❌ Debes especificar un email');
        console.log('Uso: node scripts/supabase-cmd.js find-user <email>');
        process.exit(1);
      }
      await manager.findUser(args[1]);
      break;

    case 'export':
      if (!args[1] || !args[2]) {
        console.error('❌ Debes especificar tabla y archivo');
        console.log('Uso: node scripts/supabase-cmd.js export <tabla> <archivo.json>');
        process.exit(1);
      }
      await manager.exportTable(args[1], args[2]);
      break;

    case 'rpc':
      if (!args[1]) {
        console.error('❌ Debes especificar función');
        console.log('Uso: node scripts/supabase-cmd.js rpc <función> <json-params>');
        process.exit(1);
      }
      const params = args[2] ? JSON.parse(args[2]) : {};
      await manager.callRpc(args[1], params);
      break;

    default:
      console.error(`❌ Comando desconocido: ${command}`);
      console.log('Usa: node scripts/supabase-cmd.js help');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SupabaseManager;
