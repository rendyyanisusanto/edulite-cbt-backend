import 'dotenv/config'

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET']

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Environment variable ${key} is required but not set.`)
  }
}

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  isDev: process.env.NODE_ENV !== 'production',
}
