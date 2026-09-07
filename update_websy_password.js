const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function updatePassword() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558', readyTimeout: 20000 });
    console.log('Connected!');

    const pgContainerRes = await ssh.execCommand('docker ps --filter "name=postgres" --format "{{.Names}}"');
    const pgContainerName = pgContainerRes.stdout.trim().split('\n')[0];
    console.log(`PG Container found: "${pgContainerName}"`);

    // Actualizar la contraseña para usar el caracter '+'
    const updateCmd = `docker exec -t ${pgContainerName} psql -U posgrest -d tienda -c "UPDATE usuarios SET contraseña = 'Websy+42729558' WHERE correo = 'websyar@gmail.com';"`;
    const updateRes = await ssh.execCommand(updateCmd);
    console.log('STDOUT:', updateRes.stdout);
    if(updateRes.stderr) console.error('STDERR:', updateRes.stderr);

    ssh.dispose();
  } catch (e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}
updatePassword();
