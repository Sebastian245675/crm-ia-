async function testLogin() {
  try {
    const url = 'https://backend.websysrl.com/api/auth/login';
    console.log(`Sending POST to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text);
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
}

testLogin();
