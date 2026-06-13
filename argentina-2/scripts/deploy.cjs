/**
 * Script de despliegue automático para OmniShop
 * Sube la carpeta dist/ al servidor via SFTP
 * 
 * Uso: node scripts/deploy.cjs
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════
// CONFIGURACIÓN DEL SERVIDOR
// ═══════════════════════════════════════════
const SERVER = {
  host: '46.202.145.83',
  port: 65002,
  username: 'u999131485',
  password: process.env.SSH_PASSWORD || 'jjhdaA*wedsdqw34',
};

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCAL_DIST = path.join(PROJECT_ROOT, 'dist');

// Rutas posibles del web root en Hostinger
const POSSIBLE_ROOTS = [
  '/home/u999131485/domains/omnishop.com/public_html',
  '/home/u999131485/public_html',
  '/home/u999131485/htdocs',
];

// ═══════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════
function log(msg) {
  console.log(`[DEPLOY] ${msg}`);
}

function logError(msg) {
  console.error(`[ERROR] ${msg}`);
}

function logSuccess(msg) {
  console.log(`[✓] ${msg}`);
}

/**
 * Ejecuta un comando SSH y devuelve la salida
 */
function execSSH(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data) => { stdout += data.toString(); });
      stream.stderr.on('data', (data) => { stderr += data.toString(); });
      stream.on('close', (code) => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      });
    });
  });
}

/**
 * Obtiene todos los archivos de un directorio recursivamente
 */
function getAllFiles(dirPath, basePath = dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, basePath));
    } else {
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
      files.push({ localPath: fullPath, remotePath: relativePath });
    }
  }
  return files;
}

/**
 * Crea un directorio remoto (mkdir -p equivalente via SFTP)
 */
function mkdirRemote(sftp, remotePath) {
  return new Promise((resolve) => {
    sftp.mkdir(remotePath, (err) => {
      resolve(); // Ignora error si ya existe
    });
  });
}

/**
 * Sube un archivo via SFTP
 */
function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Obtiene los directorios únicos de una lista de archivos
 */
function getUniqueDirs(files) {
  const dirs = new Set();
  for (const file of files) {
    const parts = file.remotePath.split('/');
    for (let i = 1; i <= parts.length - 1; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  // Ordenar por profundidad para crear padres primero
  return [...dirs].sort((a, b) => a.split('/').length - b.split('/').length);
}

// ═══════════════════════════════════════════
// LÓGICA PRINCIPAL
// ═══════════════════════════════════════════
async function deploy() {
  // Verificar que dist existe
  if (!fs.existsSync(LOCAL_DIST)) {
    logError('La carpeta dist/ no existe. Ejecuta "npm run build" primero.');
    process.exit(1);
  }

  const files = getAllFiles(LOCAL_DIST);
  log(`Se encontraron ${files.length} archivos para subir.`);

  const conn = new Client();

  conn.on('error', (err) => {
    logError(`Error de conexión: ${err.message}`);
    process.exit(1);
  });

  conn.on('ready', async () => {
    logSuccess('Conectado al servidor SSH');

    try {
      // 1. Detectar la ruta del web root
      let webRoot = null;
      for (const root of POSSIBLE_ROOTS) {
        const result = await execSSH(conn, `test -d "${root}" && echo "EXISTS"`);
        if (result.stdout === 'EXISTS') {
          webRoot = root;
          break;
        }
      }

      if (!webRoot) {
        // Intentar encontrar con find
        const findResult = await execSSH(conn, 'find /home/u999131485 -maxdepth 4 -name "public_html" -type d 2>/dev/null | head -1');
        if (findResult.stdout) {
          webRoot = findResult.stdout;
        }
      }

      if (!webRoot) {
        logError('No se pudo encontrar el directorio public_html. Rutas probadas:');
        POSSIBLE_ROOTS.forEach(r => console.log(`  - ${r}`));
        conn.end();
        process.exit(1);
      }

      logSuccess(`Web root detectado: ${webRoot}`);

      // 2. Crear backup del directorio assets actual
      log('Creando backup de assets actuales...');
      const backupName = `assets_backup_${Date.now()}`;
      await execSSH(conn, `cd "${webRoot}" && if [ -d assets ]; then mv assets ${backupName}; fi`);
      logSuccess('Backup creado');

      // 3. Abrir SFTP
      const sftp = await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          resolve(sftp);
        });
      });

      logSuccess('Sesión SFTP abierta');

      // 4. Crear directorios remotos
      const dirs = getUniqueDirs(files);
      log(`Creando ${dirs.length} directorios...`);
      for (const dir of dirs) {
        await mkdirRemote(sftp, `${webRoot}/${dir}`);
      }
      logSuccess('Directorios creados');

      // 5. Subir archivos
      log(`Subiendo ${files.length} archivos...`);
      let uploaded = 0;
      let errors = 0;

      for (const file of files) {
        const remoteFull = `${webRoot}/${file.remotePath}`;
        try {
          await uploadFile(sftp, file.localPath, remoteFull);
          uploaded++;
          // Mostrar progreso cada 10 archivos
          if (uploaded % 10 === 0 || uploaded === files.length) {
            process.stdout.write(`\r[DEPLOY] Progreso: ${uploaded}/${files.length} archivos subidos`);
          }
        } catch (err) {
          errors++;
          logError(`Error subiendo ${file.remotePath}: ${err.message}`);
        }
      }

      console.log(''); // Nueva línea después del progreso
      logSuccess(`Upload completado: ${uploaded} subidos, ${errors} errores`);

      // 6. Eliminar backup si todo fue bien
      if (errors === 0) {
        await execSSH(conn, `cd "${webRoot}" && rm -rf ${backupName}`);
        logSuccess('Backup eliminado (deploy exitoso)');
      } else {
        log(`Backup conservado como: ${webRoot}/${backupName}`);
      }

      // 7. Verificar el .htaccess para SPA routing
      log('Verificando .htaccess para SPA...');
      const htaccessCheck = await execSSH(conn, `test -f "${webRoot}/.htaccess" && echo "EXISTS"`);
      if (htaccessCheck.stdout !== 'EXISTS') {
        log('Creando .htaccess para SPA routing...');
        const htaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Cache de assets estáticos
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

# Compresión gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>`;
        
        await new Promise((resolve, reject) => {
          const writeStream = sftp.createWriteStream(`${webRoot}/.htaccess`);
          writeStream.on('close', resolve);
          writeStream.on('error', reject);
          writeStream.end(htaccess);
        });
        logSuccess('.htaccess creado');
      } else {
        logSuccess('.htaccess ya existe');
      }

      // 8. Resumen final
      console.log('\n═══════════════════════════════════════');
      console.log('  ✅ DEPLOY COMPLETADO EXITOSAMENTE');
      console.log('═══════════════════════════════════════');
      console.log(`  Archivos subidos: ${uploaded}`);
      console.log(`  Destino: ${webRoot}`);
      console.log(`  Sitio: https://omnishop.com`);
      console.log('═══════════════════════════════════════\n');

      sftp.end();
      conn.end();

    } catch (err) {
      logError(`Error durante el deploy: ${err.message}`);
      console.error(err);
      conn.end();
      process.exit(1);
    }
  });

  log('Conectando al servidor...');
  conn.connect(SERVER);
}

deploy();
