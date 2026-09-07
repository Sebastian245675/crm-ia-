const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function debug() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558', readyTimeout: 20000 });
    console.log('Connected!');

    const pgContainerRes = await ssh.execCommand('docker ps --filter "name=postgres" --format "{{.Names}}"');
    const pgContainerName = pgContainerRes.stdout.trim().split('\n')[0];

    const query = `SELECT correo, LENGTH(correo) FROM usuarios;`;
    const checkRes = await ssh.execCommand(`docker exec -t ${pgContainerName} psql -U posgrest -d tienda -t -A -c "${query}"`);
    
    const output = checkRes.stdout.trim();
    console.log('DB Output raw:', JSON.stringify(output));
    
    const rows = output.split('\n');
    for (const row of rows) {
      if (!row) continue;
      const parts = row.split('|');
      const email = parts[0];
      const len = parts[1];
      console.log(`Email: "${email}" (PG length: ${len}, JS length: ${email.length})`);
      for (let i = 0; i < email.length; i++) {
        console.log(`  char[${i}]: ${email.charCodeAt(i)} ('${email[i]}')`);
      }
    }

    const testPass = 'Websy+42729558';
    console.log(`Test Password: "${testPass}" (JS length: ${testPass.length})`);
    console.log('Test Password Char Codes:');
    for(let i=0; i<testPass.length; i++) {
      console.log(`  char[${i}]: ${testPass.charCodeAt(i)} ('${testPass[i]}')`);
    }

    ssh.dispose();
  } catch (e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}
debug();
