import { Router } from 'express'
import { getRooms } from '../controllers/rooms.controller.js'

const router = Router()

router.get('/', getRooms)

export default router
