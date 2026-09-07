const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558', readyTimeout: 20000 });
    console.log('Connected to VPS!');

    const localScript = path.resolve(__dirname, 'debug_backend_db.js');
    const remoteScript = '/var/www/crm-ia/backend/debug_backend_db.js';

    console.log('Uploading script...');
    await ssh.putFile(localScript, remoteScript);
    console.log('Script uploaded.');

    console.log('Copying script into docker container crm-ia-backend-1...');
    await ssh.execCommand('docker cp /var/www/crm-ia/backend/debug_backend_db.js crm-ia-backend-1:/usr/src/app/debug_backend_db.js');

    console.log('Running script inside docker container...');
    const res = await ssh.execCommand('docker exec -t crm-ia-backend-1 node debug_backend_db.js');
    console.log('\n--- Script Output ---');
    console.log(res.stdout);
    if(res.stderr) console.error('STDERR:', res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error(err);
    if(ssh) ssh.dispose();
  }
}

run();
