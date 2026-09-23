const jwt = require('jsonwebtoken')
const mysql = require('mysql2/promise')
require('dotenv').config()

async function testAuth() {
  try {
    const token = jwt.sign({
      sub: 1,
      type: 'STUDENT',
      studentId: 1
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' })
    
    console.log('\nGot token:', token)
    
    // 2. Fetch Me
    console.log('\nFetching /me...')
    const meRes = await fetch('http://localhost:3000/api/student/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const meData = await meRes.json()
    console.log('Me response:', meData)
  } catch (err) {
    console.error('Error:', err)
  }
}

testAuth()
