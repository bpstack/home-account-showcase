// controllers/budget/budget-controller.ts

import { Request, Response } from 'express'
import { BudgetRepository } from '../../repositories/budget/budget-repository.js'
import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { createBudgetSchema, updateBudgetSchema } from '../../validators/budget-validators.js'

export const getBudgets = asyncHandler(async (req: Request, res: Response) => {
  const { account_id } = req.query

  if (!account_id || typeof account_id !== 'string') {
    throw new AppError('account_id es requerido', 400)
  }

  const budgets = await BudgetRepository.getByAccountId(account_id)

  res.status(200).json({
    success: true,
    data: budgets,
  })
})

export const getBudget = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { account_id } = req.query

  if (!account_id || typeof account_id !== 'string') {
    throw new AppError('account_id es requerido', 400)
  }

  const budget = await BudgetRepository.getById(id)

  if (!budget || budget.account_id !== account_id) {
    throw new AppError('Presupuesto no encontrado', 404)
  }

  res.status(200).json({
    success: true,
    data: budget,
  })
})

export const createBudget = asyncHandler(async (req: Request, res: Response) => {
  const result = createBudgetSchema.safeParse(req.body)
  
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { account_id, category_id, amount, period, alert_threshold } = result.data

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
    const messages = result.error.issues.map(i => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { account_id, amount, period, alert_threshold } = result.data

  const existing = await BudgetRepository.getById(id)
  if (!existing || existing.account_id !== account_id) {
    throw new AppError('Presupuesto no encontrado', 404)
  }

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
  const { account_id } = req.body

  if (!account_id) {
    throw new AppError('account_id es requerido', 400)
  }

  const existing = await BudgetRepository.getById(id)
  if (!existing || existing.account_id !== account_id) {
    throw new AppError('Presupuesto no encontrado', 404)
  }

  await BudgetRepository.delete(id)

  res.status(200).json({
    success: true,
    message: 'Presupuesto eliminado',
  })
})
