import app from './app.js'
import { env } from './config/env.js'
import { checkDatabaseConnection } from './config/database.js'

async function bootstrap() {
  try {
    // 1. Verify database connection before accepting traffic
    await checkDatabaseConnection()

    // 2. Start HTTP server
    app.listen(env.port, () => {
      console.log(`🚀 CBT Edulite API running on http://localhost:${env.port}`)
      console.log(`📡 CORS allowed origin: ${env.frontendUrl}`)
      console.log(`🔒 JWT expires in: ${env.jwt.expiresIn}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error.message)
    process.exit(1)
  }
}

bootstrap()
