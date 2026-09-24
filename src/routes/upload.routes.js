import express from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { response } from '../utils/response.js'

const router = express.Router()

router.post('/image', authenticate, (req, res, next) => {
  try {
    const { image } = req.body
    if (!image) {
      return response.error(res, { statusCode: 400, message: 'Image data is required' })
    }

    // Check if it's a base64 string
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return response.error(res, { statusCode: 400, message: 'Invalid base64 string' })
    }

    const type = matches[1]
    const data = Buffer.from(matches[2], 'base64')
    
    // Generate a unique filename
    let ext = 'jpg'
    if (type === 'image/png') ext = 'png'
    else if (type === 'image/jpeg') ext = 'jpg'
    
    const filename = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}.${ext}`
    const uploadsDir = path.join(process.cwd(), 'uploads')
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const filepath = path.join(uploadsDir, filename)
    fs.writeFileSync(filepath, data)

    // Return the absolute URL path
    const url = `${req.protocol}://${req.get('host')}/api/uploads/${filename}`
    
    response.success(res, { statusCode: 201, message: 'Image uploaded successfully', data: { url } })
  } catch (error) {
    next(error)
  }
})

export default router
