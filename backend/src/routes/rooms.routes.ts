import { Router } from 'express'
import { getRooms } from '../controllers/rooms.controller.js'
import { deleteVote, postVote } from '../controllers/votes.controller.js'

const router = Router()

router.get('/', getRooms)
router.post('/:room/votes', postVote)
router.delete('/:room/votes/:attribute', deleteVote)

export default router
