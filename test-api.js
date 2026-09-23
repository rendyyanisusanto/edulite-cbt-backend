async function run() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/student/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: '0604/0476.421',
        password: 'EDU6UVFH'
      })
    });
    const loginData = await loginRes.json();
    
    console.log('Login success!', loginData.message);
    const token = loginData.data.accessToken;

    const examRes = await fetch('http://localhost:3000/api/student/exams/1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const examData = await examRes.json();

    console.log('Exam Detail fetched:', JSON.stringify(examData, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  }
}
run();
