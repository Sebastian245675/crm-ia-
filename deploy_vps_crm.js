const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('🔄 Conectando al VPS...');
    await ssh.connect({
      host: '2.24.100.82',
      username: 'root',
      password: 'Websy+42729558',
      readyTimeout: 20000
    });
    console.log('✅ ¡Conectado!');

    const projectDir = '/var/www/crm-ia';

    // 1. Limpiar carpetas creadas con contra-barras por error
    console.log('🧹 Eliminando carpetas con contra-barras creadas por error en el VPS...');
    await ssh.execCommand('rm -rf "/var/www/crm-ia\\backend" "/var/www/crm-ia\\argentina-2" "/var/www/crm-ia\\landing-page"');

    // 2. Limpiar cambios locales sucios en el VPS para evitar conflictos
    console.log('🧹 Limpiando repositorio en el VPS...');
    await ssh.execCommand('git reset --hard && git clean -fd', { cwd: projectDir });

    // Helper para unir rutas remotas usando barra diagonal (Linux)
    const joinRemote = (...args) => args.join('/').replace(/\/+/g, '/');

    // 3. Subir archivos locales del frontend, backend y landing-page
    const uploadDir = async (localName, remoteName) => {
      const localPath = path.resolve(__dirname, localName);
      const remotePath = joinRemote(projectDir, remoteName);
      console.log(`📤 Subiendo ${localName} a ${remotePath}...`);
      await ssh.putDirectory(localPath, remotePath, {
        recursive: true,
        concurrency: 10,
        validate: (itemPath) => {
          const base = path.basename(itemPath);
          const shouldSkip = [
            'node_modules',
            'dist',
            '.git',
            '.next',
            '.astro',
            'uploads',
            'tienda.db',
            'backend.log',
            'frontend.log',
            '.env',
            '.env.local',
            '.env.production'
          ].includes(base);
          return !shouldSkip;
        }
      });
      console.log(`✅ ${localName} subido.`);
    };

    // Subir docker-compose.yml
    console.log('📤 Subiendo docker-compose.yml...');
    await ssh.putFile(path.resolve(__dirname, 'docker-compose.yml'), joinRemote(projectDir, 'docker-compose.yml'));

    // Subir subcarpetas
    await uploadDir('backend', 'backend');
    await uploadDir('argentina-2', 'argentina-2');
    await uploadDir('landing-page', 'landing-page');

    // 4. Eliminar archivos que fueron eliminados localmente
    console.log('🧹 Eliminando archivos obsoletos en el VPS...');
    await ssh.execCommand('rm -f argentina-2/src/components/admin/InfoManager.tsx', { cwd: projectDir });

    // 5. Reconstruir e iniciar contenedor backend de Docker usando docker compose (v2)
    console.log('⚙️ Reconstruyendo contenedor docker del backend (usando docker compose v2)...');
    const buildRes = await ssh.execCommand('docker compose build backend && docker compose up -d --force-recreate backend', { cwd: projectDir });
    console.log(buildRes.stdout);
    if (buildRes.stderr) console.error(buildRes.stderr);

    // 6. Compilar Frontend panel (argentina-2)
    const frontendDir = joinRemote(projectDir, 'argentina-2');
    console.log(`⚙️ Reemplazando URLs de API en el Frontend (${frontendDir})...`);
    await ssh.execCommand(`find src -name "*.ts*" -type f -exec sed -i "s|fetch('/api|fetch('https://backend.websysrl.com/api|g" {} +`, { cwd: frontendDir });
    await ssh.execCommand(`find src -name "*.ts*" -type f -exec sed -i "s|fetch(\\"/api|fetch(\\"https://backend.websysrl.com/api|g" {} +`, { cwd: frontendDir });
    await ssh.execCommand("find src -name \"*.ts*\" -type f -exec sed -i 's|fetch(\`/api|fetch(\`https://backend.websysrl.com/api|g' {} +", { cwd: frontendDir });
    await ssh.execCommand(`find src -name "*.ts*" -type f -exec sed -i "s|http://2.24.100.82:8000|https://backend.websysrl.com|g" {} +`, { cwd: frontendDir });

    console.log(`⚙️ Instalando dependencias y compilando Frontend (en ${frontendDir})...`);
    const feRes = await ssh.execCommand('npm install --legacy-peer-deps && npm run build', { cwd: frontendDir });
    console.log(feRes.stdout);
    if (feRes.stderr) console.error(feRes.stderr);

    console.log('🔄 Reiniciando frontend en PM2...');
    await ssh.execCommand('pm2 restart frontend');

    // 7. Compilar Landing Page
    const landingDir = joinRemote(projectDir, 'landing-page');
    console.log(`⚙️ Reemplazando URLs de redirección en la Landing Page (${landingDir})...`);
    await ssh.execCommand(`find src -name "*.astro" -type f -exec sed -i "s|http://localhost:8080|https://panel.websysrl.com|g" {} +`, { cwd: landingDir });
    await ssh.execCommand(`find src -name "*.astro" -type f -exec sed -i "s|http://2.24.100.82:3000|https://panel.websysrl.com|g" {} +`, { cwd: landingDir });

    console.log(`⚙️ Compilando Landing Page (en ${landingDir})...`);
    const lpRes = await ssh.execCommand('npm run build', { cwd: landingDir });
    console.log(lpRes.stdout);
    if (lpRes.stderr) console.error(lpRes.stderr);

    console.log('🔄 Reiniciando landing page en PM2...');
    await ssh.execCommand('pm2 restart landing');

    console.log('\n🚀 ¡DESPLIEGUE Y ACTUALIZACIÓN COMPLETADOS CON ÉXITO!');
    ssh.dispose();
  } catch (error) {
    console.error('\n❌ Error durante el despliegue:', error);
    if (ssh) ssh.dispose();
  }
}

deploy();
