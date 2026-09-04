import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import roomsRoutes from './routes/rooms.routes.js'
import refreshRoutes from './routes/refresh.routes.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL ?? '*' }))
app.use(express.json())

app.use('/api/rooms', roomsRoutes)
app.use('/api/refresh', refreshRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT ?? 3001

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Backend running on :${PORT}`))
}

export default app
