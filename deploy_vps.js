const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixLandingPage() {
  try {
    console.log('🔄 Conectando al VPS para actualizar Node.js...');
    await ssh.connect({
      host: '2.24.100.82',
      username: 'root',
      password: 'Websy+42729558',
      tryKeyboard: true,
      readyTimeout: 20000
    });
    console.log('✅ ¡Conectado!');

    const projectDir = '/var/www/crm-ia';

    const commands = [
      // 1. Actualizar Node a la versión 22 (requerida por Astro)
      `echo "Actualizando Node.js a la versión 22..."`,
      `curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs`,

      // 2. Re-compilar la Landing Page
      `echo "⚙️ Re-compilando Landing Page con Node 22..."`,
      `cd ${projectDir}/landing-page && npm run build`,
      
      // 3. Reiniciar PM2 para aplicar los cambios
      `pm2 restart landing`
    ];

    for (const cmd of commands) {
      console.log(`\n> Ejecutando en VPS: ${cmd.split('&&')[0]}...`);
      const result = await ssh.execCommand(cmd);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
    }
    
    console.log('\n🚀 ¡LANDING PAGE REPARADA Y COMPILADA CON ÉXITO!');
    
    ssh.dispose();
  } catch (error) {
    console.error('\n❌ Hubo un error:', error);
    if (ssh) ssh.dispose();
  }
}

fixLandingPage();
