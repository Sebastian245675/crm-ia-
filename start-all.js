const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = __dirname;
const services = [
  { name: 'BACKEND', directory: 'backend', color: '\x1b[36m' },
  { name: 'APP', directory: 'argentina-2', color: '\x1b[35m' },
  { name: 'LANDING', directory: 'landing-page', color: '\x1b[33m' },
];

const resetColor = '\x1b[0m';
const children = new Set();
let shuttingDown = false;

function npmCommand(args) {
  const bundledNpmCli = path.join(
    path.dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  const npmCli = process.env.npm_execpath || bundledNpmCli;

  if (fs.existsSync(npmCli)) {
    return { command: process.execPath, args: [npmCli, ...args], shell: false };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args,
    shell: false,
  };
}

function label(service) {
  return `${service.color}[${service.name}]${resetColor}`;
}

function writeLines(stream, service, output) {
  let pending = '';

  output.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) stream.write(`${label(service)} ${line}\n`);
  });

  output.on('end', () => {
    if (pending) stream.write(`${label(service)} ${pending}\n`);
  });
}

function runNpm(service, args) {
  return new Promise((resolve, reject) => {
    const npm = npmCommand(args);
    const child = spawn(npm.command, npm.args, {
      cwd: path.join(rootDir, service.directory),
      env: process.env,
      shell: npm.shell,
      windowsHide: true,
    });

    children.add(child);
    writeLines(process.stdout, service, child.stdout);
    writeLines(process.stderr, service, child.stderr);

    child.once('error', (error) => {
      children.delete(child);
      reject(error);
    });

    child.once('exit', (code, signal) => {
      children.delete(child);
      resolve({ code, signal });
    });
  });
}

async function ensureDependencies(service) {
  const serviceDir = path.join(rootDir, service.directory);
  const packageFile = path.join(serviceDir, 'package.json');
  const modulesDir = path.join(serviceDir, 'node_modules');

  if (!fs.existsSync(packageFile)) {
    throw new Error(`No existe ${packageFile}`);
  }

  if (fs.existsSync(modulesDir)) return;

  console.log(`${label(service)} Instalando dependencias...`);
  const result = await runNpm(service, ['install']);
  if (result.code !== 0) {
    throw new Error(`npm install fallo en ${service.directory} (codigo ${result.code})`);
  }
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    child.kill('SIGTERM');
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('\nApagando todos los servicios...');
  for (const child of children) stopChild(child);
  process.exit(exitCode);
}

async function main() {
  const npm = npmCommand(['--version']);
  const npmCheck = spawnSync(npm.command, npm.args, {
    encoding: 'utf8',
    shell: npm.shell,
    windowsHide: true,
  });

  if (npmCheck.status !== 0) {
    throw new Error('No se encontro npm. Instala Node.js y vuelve a intentarlo.');
  }

  await Promise.all(services.map(ensureDependencies));

  console.log('\nIniciando el proyecto completo...');
  console.log('  Backend: http://localhost:8000');
  console.log('  Aplicacion: http://localhost:8080');
  console.log('  Landing page: http://localhost:4321');
  console.log('\nPresiona Ctrl+C para detener todo.\n');

  for (const service of services) {
    runNpm(service, ['run', 'dev'])
      .then(({ code, signal }) => {
        if (shuttingDown) return;
        const reason = signal ? `senal ${signal}` : `codigo ${code}`;
        console.error(`${label(service)} Se detuvo inesperadamente (${reason}).`);
        shutdown(code || 1);
      })
      .catch((error) => {
        if (shuttingDown) return;
        console.error(`${label(service)} No pudo iniciarse: ${error.message}`);
        shutdown(1);
      });
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  shutdown(1);
});
