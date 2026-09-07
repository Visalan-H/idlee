import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { runRefresh, runTick } from '../controllers/refresh.controller.js'

const router = Router()

router.post('/', protect, runRefresh)
router.post('/tick', protect, runTick)

export default router
