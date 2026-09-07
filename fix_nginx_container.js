const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixNginx() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    const conf = `
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

    // Write directly into the running Nginx container
    console.log("Writing config into running container...");
    await ssh.execCommand(`cat << 'EOF' | docker exec -i inmobiliaria_web sh -c 'cat > /etc/nginx/conf.d/crm.conf'\n${conf}\nEOF`);
    
    console.log("Reloading Nginx...");
    const res = await ssh.execCommand('docker exec inmobiliaria_web nginx -s reload');
    console.log("Reload result:", res.stdout, res.stderr);

    // Append to the host's default.conf so it persists if they rebuild the image
    console.log("Appending config to host default.conf for persistence...");
    await ssh.execCommand(`cat << 'EOF' >> /root/apps/inmobiliaria/deploy/nginx/default.conf\n${conf}\nEOF`);
    
    console.log("¡Hecho!");
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}
fixNginx();
