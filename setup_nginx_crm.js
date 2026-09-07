const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function setupNginx() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    
    console.log("Instalando certbot en el host...");
    await ssh.execCommand('apt-get update && apt-get install -y certbot');

    console.log("Configurando bloque HTTP inicial para validación...");
    const httpConf = `
server {
    listen 80;
    server_name merco.websysrl.com panel.websysrl.com backend.websysrl.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://2.24.100.82:3000;
    }
}
`;
    // Escribimos el archivo dentro del volumen de Nginx del contenedor existente
    await ssh.execCommand(`cat << 'EOF' > /root/apps/inmobiliaria/deploy/nginx/crm.conf\n${httpConf}\nEOF`);
    await ssh.execCommand('docker exec inmobiliaria_web nginx -s reload');
    
    console.log("Esperando 5 segundos para que Nginx recargue y el DNS se propague si es necesario...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("Generando certificados SSL con Certbot...");
    const certCmd = `certbot certonly --webroot -w /root/apps/inmobiliaria/deploy/nginx/certbot/www ` +
                    `--config-dir /root/apps/inmobiliaria/deploy/nginx/certbot/conf ` +
                    `--work-dir /root/apps/inmobiliaria/deploy/nginx/certbot/work ` +
                    `--logs-dir /root/apps/inmobiliaria/deploy/nginx/certbot/logs ` +
                    `-d merco.websysrl.com -d panel.websysrl.com -d backend.websysrl.com ` +
                    `--non-interactive --agree-tos --register-unsafely-without-email`;
    const certRes = await ssh.execCommand(certCmd);
    console.log(certRes.stdout);
    if(certRes.stderr) console.error(certRes.stderr);

    console.log("Configurando bloque HTTPS final...");
    const httpsConf = `
server {
    listen 80;
    server_name merco.websysrl.com panel.websysrl.com backend.websysrl.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name merco.websysrl.com;

    ssl_certificate /etc/letsencrypt/live/merco.websysrl.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/merco.websysrl.com/privkey.pem;

    location / {
        proxy_pass http://2.24.100.82:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name panel.websysrl.com;

    ssl_certificate /etc/letsencrypt/live/merco.websysrl.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/merco.websysrl.com/privkey.pem;

    location / {
        proxy_pass http://2.24.100.82:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name backend.websysrl.com;

    ssl_certificate /etc/letsencrypt/live/merco.websysrl.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/merco.websysrl.com/privkey.pem;

    location / {
        proxy_pass http://2.24.100.82:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
    await ssh.execCommand(`cat << 'EOF' > /root/apps/inmobiliaria/deploy/nginx/crm.conf\n${httpsConf}\nEOF`);
    await ssh.execCommand('docker exec inmobiliaria_web nginx -s reload');
    
    console.log("¡Configuración de Nginx y SSL completada!");
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}

setupNginx();
