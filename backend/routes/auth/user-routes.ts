// routes/auth/user-routes.ts

import { Router } from 'express'
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetUserPassword,
  changeUserPassword,
} from '../../controllers/auth/user-controllers.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router: Router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// Rutas de usuarios
router.get('/', getAllUsers)
router.get('/:id', getUserById)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)
router.post('/:id/reset-password', resetUserPassword)
router.post('/:id/change-password', changeUserPassword)

export default router
