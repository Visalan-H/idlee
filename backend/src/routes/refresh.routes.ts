import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { runRefresh } from '../controllers/refresh.controller.js'

const router = Router()

router.post('/', protect, runRefresh)

export default router
