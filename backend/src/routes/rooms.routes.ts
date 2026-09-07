import { Router } from 'express'
import { getRooms } from '../controllers/rooms.controller.js'
import { postVote } from '../controllers/votes.controller.js'

const router = Router()

router.get('/', getRooms)
router.post('/:room/votes', postVote)

export default router
