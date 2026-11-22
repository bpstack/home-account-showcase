// controllers/budget/budget-controller.ts

import { Request, Response } from 'express'
import { BudgetRepository } from '../../repositories/budget/budget-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'
import { CategoryRepository } from '../../repositories/categories/category-repository.js'
import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { createBudgetSchema, updateBudgetSchema } from '../../validators/budget-validators.js'

/**
 * Loads a budget only if the user belongs to its account. The account is taken
 * from the stored row, never from the request. Missing and forbidden both answer
 * 404, so a budget id does not reveal whether it exists.
 */
async function getOwnedBudget(id: string, userId: string) {
  const budget = await BudgetRepository.getById(id)

  if (!budget || !(await AccountRepository.hasAccess(budget.account_id, userId))) {
    throw new AppError('Presupuesto no encontrado', 404)
  }

  return budget
}

export const getBudgets = asyncHandler(async (req: Request, res: Response) => {
  const { account_id } = req.query

  if (!account_id || typeof account_id !== 'string') {
    throw new AppError('account_id es requerido', 400)
  }

  const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const budgets = await BudgetRepository.getByAccountId(account_id)

  res.status(200).json({
    success: true,
    data: budgets,
  })
})

export const getBudget = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const budget = await getOwnedBudget(id, req.user!.id)

  res.status(200).json({
    success: true,
    data: budget,
  })
})

export const createBudget = asyncHandler(async (req: Request, res: Response) => {
  const result = createBudgetSchema.safeParse(req.body)

  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { account_id, category_id, amount, period, alert_threshold } = result.data

  const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  // The category must belong to this same account
  const category = await CategoryRepository.getById(category_id, req.user!.id)
  if (!category || category.account_id !== account_id) {
    throw new AppError('Categoría no encontrada', 404)
  }

  const budget = await BudgetRepository.create({
    account_id,
    category_id,
    amount,
    period,
    alert_threshold,
  })

  res.status(201).json({
    success: true,
    data: budget,
  })
})

export const updateBudget = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const result = updateBudgetSchema.safeParse(req.body)

  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { amount, period, alert_threshold } = result.data

  await getOwnedBudget(id, req.user!.id)

  const budget = await BudgetRepository.update(id, {
    amount,
    period,
    alert_threshold,
  })

  res.status(200).json({
    success: true,
    data: budget,
  })
})

export const deleteBudget = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  await getOwnedBudget(id, req.user!.id)

  await BudgetRepository.delete(id)

  res.status(200).json({
    success: true,
    message: 'Presupuesto eliminado',
  })
})
