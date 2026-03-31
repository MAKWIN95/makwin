#!/usr/bin/env node
/**
 * env-manager.js
 * Gestiona las variables de entorno desde .secrets.local
 * Uso: node scripts/env-manager.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class EnvManager {
  constructor() {
    this.secretsPath = path.join(__dirname, '..', '.secrets.local');
    this.env = this.loadSecrets();
  }

  /**
   * Carga las variables desde .secrets.local
   */
  loadSecrets() {
    if (!fs.existsSync(this.secretsPath)) {
      throw new Error(
        `❌ Archivo .secrets.local no encontrado en ${this.secretsPath}\n` +
        'Crea el archivo con tus credenciales primero.'
      );
    }

    const content = fs.readFileSync(this.secretsPath, 'utf-8');
    const parsed = dotenv.parse(content);
    return parsed;
  }

  /**
   * Obtiene una variable de entorno
   */
  get(key) {
    const value = this.env[key];
    if (!value) {
      console.warn(`⚠️  Variable ${key} no encontrada en .secrets.local`);
      return null;
    }
    return value;
  }

  /**
   * Obtiene todas las variables
   */
  getAll() {
    return this.env;
  }

  /**
   * Valida que todas las variables necesarias estén presentes
   */
  validate(requiredKeys) {
    const missing = requiredKeys.filter(key => !this.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ Variables faltantes en .secrets.local:`);
      missing.forEach(key => console.error(`   - ${key}`));
      throw new Error('Variables de entorno incompletas');
    }

    console.log(`✅ Todas las variables requeridas están presentes`);
    return true;
  }

  /**
   * Imprime las variables (sin mostrar valores completos por seguridad)
   */
  print() {
    console.log('\n📋 Variables cargadas desde .secrets.local:\n');
    Object.entries(this.env).forEach(([key, value]) => {
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      console.log(`  ${key}: ${masked}`);
    });
    console.log('');
  }
}

// Exportar para uso en otros scripts
module.exports = EnvManager;

// Si se ejecuta directamente, mostrar las variables
if (require.main === module) {
  try {
    const manager = new EnvManager();
    manager.print();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
