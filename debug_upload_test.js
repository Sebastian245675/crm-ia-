const fs = require('fs');
const path = require('path');
(async () => {
  try {
    const loginRes = await fetch('http://127.0.0.1:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' })
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN', JSON.stringify(loginJson));
    const token = loginJson.user?.access_token;
    if (!token) return;
    const filePath = path.join(__dirname, 'argentina-2', 'public', 'robots.txt');
    const fileBuffer = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('file', new Blob([fileBuffer]), 'robots.txt');
    const uploadRes = await fetch('http://127.0.0.1:8080/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    console.log('STATUS', uploadRes.status, uploadRes.statusText);
    const text = await uploadRes.text();
    console.log('BODY', text);
  } catch (err) {
    console.error(err);
  }
})();
