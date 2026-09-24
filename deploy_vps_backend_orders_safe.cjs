const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const password = process.env.SSH_PASSWORD;
if (!password) {
  console.error('SSH_PASSWORD is required.');
  process.exit(2);
}

const projectDir = '/var/www/crm-ia';
const remoteBackend = `${projectDir}/backend`;
const releaseId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const remoteBackup = `${projectDir}/.deploy_backups/backend_orders/${releaseId}`;
const files = [
  ['backend/src/database/database.service.ts', `${remoteBackend}/src/database/database.service.ts`, 'database.service.ts'],
  ['backend/src/ventas/ventas.controller.ts', `${remoteBackend}/src/ventas/ventas.controller.ts`, 'ventas.controller.ts'],
];

const connection = new Client();
let sourceSwapped = false;

const exec = (command, cwd = projectDir) => new Promise((resolve, reject) => {
  connection.exec(`cd "${cwd}" && ${command}`, (error, stream) => {
    if (error) return reject(error);
    let stdout = '';
    let stderr = '';
    stream.on('data', (chunk) => { stdout += chunk.toString(); });
    stream.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    stream.on('close', (code) => code === 0
      ? resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
      : reject(new Error([stdout.trim(), stderr.trim()].filter(Boolean).join('\n') || `Command failed (${code})`)));
  });
});

const putFile = (sftp, local, remote) => new Promise((resolve, reject) => {
  sftp.fastPut(local, remote, (error) => error ? reject(error) : resolve());
});

connection.on('keyboard-interactive', (_name, _instructions, _language, prompts, finish) => finish(prompts.map(() => password)));
connection.on('error', (error) => {
  console.error(`[BACKEND_DEPLOY_FAILED] ${error.message}`);
  process.exitCode = 1;
});

connection.on('ready', async () => {
  try {
    console.log(`[BACKEND] Preparing order sales release ${releaseId}.`);
    await exec(`mkdir -p "${remoteBackup}" "${remoteBackend}/src/database" "${remoteBackend}/src/ventas"`);
    const sftp = await new Promise((resolve, reject) => connection.sftp((error, value) => error ? reject(error) : resolve(value)));
    for (const [localRelative, remote, backupName] of files) {
      await putFile(path.resolve(__dirname, localRelative), `${remote}.next-${releaseId}`);
      await exec(`cp "${remote}" "${remoteBackup}/${backupName}"`);
    }
    sftp.end();

    sourceSwapped = true;
    for (const [, remote] of files) await exec(`mv "${remote}.next-${releaseId}" "${remote}"`);

    await exec('docker compose build backend');
    await exec('docker compose up -d --force-recreate backend');
    await exec("for i in 1 2 3 4 5 6; do curl -fsS --max-time 10 http://127.0.0.1:8000/api/public/forms/websy-cuestionario-multiservicios-2026 >/dev/null && exit 0; sleep 3; done; exit 1");
    console.log(`[BACKEND] API is healthy. Backup: ${remoteBackup}`);
  } catch (error) {
    console.error(`[BACKEND] ${error.message}`);
    if (sourceSwapped) {
      try {
        for (const [, remote, backupName] of files) await exec(`cp "${remoteBackup}/${backupName}" "${remote}"`);
        await exec('docker compose build backend && docker compose up -d --force-recreate backend');
        console.error('[BACKEND] Previous backend source restored and restarted.');
      } catch (rollbackError) {
        console.error(`[BACKEND_ROLLBACK_FAILED] ${rollbackError.message}`);
      }
    }
    process.exitCode = 1;
  } finally {
    connection.end();
  }
});

connection.connect({ host: '2.24.100.82', port: 22, username: 'root', password, tryKeyboard: true, readyTimeout: 20000 });
