const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const password = process.env.SSH_PASSWORD;
if (!password) {
  console.error('SSH_PASSWORD is required.');
  process.exit(2);
}

const localDist = path.resolve(__dirname, 'argentina-2', 'dist');
const remoteBase = '/var/www/crm-ia/argentina-2';
const releaseId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const remoteStage = `${remoteBase}/dist_next_${releaseId}`;
const remoteLive = `${remoteBase}/dist`;
const remoteBackup = `${remoteBase}/dist_backup_${releaseId}`;
const apiOrigin = 'https://backend.websysrl.com';

if (!fs.existsSync(path.join(localDist, 'index.html'))) {
  console.error('Frontend build not found. Run npm run build first.');
  process.exit(2);
}

const walk = (directory, root = directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolutePath = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(absolutePath, root);
  return [{ absolutePath, relativePath: path.relative(root, absolutePath).replace(/\\/g, '/') }];
});

const files = walk(localDist);
const connection = new Client();

const exec = (command) => new Promise((resolve, reject) => {
  connection.exec(command, (error, stream) => {
    if (error) return reject(error);
    let stdout = '';
    let stderr = '';
    stream.on('data', (chunk) => { stdout += chunk.toString(); });
    stream.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    stream.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || stdout.trim() || `Command failed (${code})`));
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
});

const openSftp = () => new Promise((resolve, reject) => connection.sftp((error, sftp) => error ? reject(error) : resolve(sftp)));
const mkdir = (sftp, directory) => new Promise((resolve, reject) => sftp.mkdir(directory, (error) => {
  if (error && error.code !== 4) return reject(error);
  resolve();
}));
const writeFile = (sftp, destination, content) => new Promise((resolve, reject) => {
  const stream = sftp.createWriteStream(destination, { mode: 0o644 });
  stream.on('error', reject);
  stream.on('close', resolve);
  stream.end(content);
});

const prepareContent = (file) => {
  const content = fs.readFileSync(file.absolutePath);
  if (!file.relativePath.endsWith('.js')) return content;
  const source = content.toString('utf8');
  return Buffer.from(source.replace(/(["'`])\/api\//g, `$1${apiOrigin}/api/`), 'utf8');
};

connection.on('keyboard-interactive', (_name, _instructions, _language, prompts, finish) => finish(prompts.map(() => password)));
connection.on('error', (error) => {
  console.error(`DEPLOY_FAILED=${error.message}`);
  process.exitCode = 1;
});

connection.on('ready', async () => {
  let swapped = false;
  try {
    console.log(`[DEPLOY] Connected. Preparing isolated release ${releaseId}.`);
    await exec(`test -d "${remoteBase}" && test -d "${remoteLive}" && mkdir -p "${remoteStage}"`);
    const sftp = await openSftp();

    const directories = [...new Set(files.flatMap((file) => {
      const parts = file.relativePath.split('/').slice(0, -1);
      return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
    }))].sort((a, b) => a.split('/').length - b.split('/').length);
    for (const directory of directories) await mkdir(sftp, `${remoteStage}/${directory}`);

    let uploaded = 0;
    for (const file of files) {
      await writeFile(sftp, `${remoteStage}/${file.relativePath}`, prepareContent(file));
      uploaded += 1;
      if (uploaded % 25 === 0 || uploaded === files.length) console.log(`[DEPLOY] Uploaded ${uploaded}/${files.length}`);
    }
    sftp.end();

    const validation = await exec(`test -s "${remoteStage}/index.html" && test -d "${remoteStage}/assets" && test $(find "${remoteStage}/assets" -maxdepth 1 -type f | wc -l) -gt 0 && ! grep -RIl --include='*.js' -E '(["'"'"'\x60])/api/' "${remoteStage}/assets" | grep -q . && echo VALID`);
    if (!validation.stdout.includes('VALID')) throw new Error('Release validation did not pass.');

    await exec(`test ! -e "${remoteBackup}" && mv "${remoteLive}" "${remoteBackup}" && mv "${remoteStage}" "${remoteLive}"`);
    swapped = true;
    await exec('pm2 restart frontend >/dev/null && sleep 1 && curl -fsS --max-time 10 http://127.0.0.1:3000/admin >/dev/null');

    const result = await exec(`stat -c '%s bytes | %y' "${remoteLive}/index.html" && echo BACKUP=${remoteBackup} && pm2 pid frontend`);
    console.log('[DEPLOY] Frontend is healthy.');
    console.log(result.stdout);
  } catch (error) {
    console.error(`[DEPLOY] ${error.message}`);
    if (swapped) {
      try {
        await exec(`mv "${remoteLive}" "${remoteStage}_failed" && mv "${remoteBackup}" "${remoteLive}" && pm2 restart frontend >/dev/null`);
        console.error('[DEPLOY] Previous frontend restored successfully.');
      } catch (rollbackError) {
        console.error(`[DEPLOY] ROLLBACK_FAILED=${rollbackError.message}`);
      }
    }
    process.exitCode = 1;
  } finally {
    connection.end();
  }
});

connection.connect({ host: '2.24.100.82', port: 22, username: 'root', password, tryKeyboard: true, readyTimeout: 20000 });
