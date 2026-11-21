import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { updateUserNameSchema } from '../../validators/settings-validators.js'

// Only the name: the email changes through the verified email-change flow
export const updateCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const nameResult = updateUserNameSchema.safeParse({ name: req.body?.name })
  if (!nameResult.success) {
    const messages = nameResult.error.issues.map((i) => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const updatedUser = await UserRepository.update(req.user!.id, { name: nameResult.data.name })

  if (!updatedUser) {
    throw new AppError('Usuario no encontrado', 404)
  }

  res.status(200).json({ success: true, user: updatedUser })
})
