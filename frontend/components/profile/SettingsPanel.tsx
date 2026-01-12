'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { accounts } from '@/lib/apiClient'
import { Button, Input } from '@/components/ui'

interface Member {
  id: string
  email: string
  name: string
  role: string
  joined_at: string
}

export function SettingsPanel() {
  const { user, account } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)

  useEffect(() => {
    if (account?.id) {
      loadMembers()
    }
  }, [account?.id])

  const loadMembers = async () => {
    if (!account?.id) return
    setIsLoadingMembers(true)
    try {
      const { members: membersData } = await accounts.getMembers(account.id)
      setMembers(membersData)
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleSaveName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const newName = formData.get('name') as string

    try {
      await accounts.update(account!.id, { name: newName })
      setMessage({ type: 'success', text: 'Nombre actualizado correctamente' })
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el nombre' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail.trim() || !newMemberName.trim() || !account?.id) return

    setIsAddingMember(true)
    setMessage(null)

    try {
      await accounts.addMember(account.id, newMemberEmail.trim(), newMemberName.trim())
      setMessage({ type: 'success', text: 'Miembro agregado correctamente' })
      setNewMemberEmail('')
      setNewMemberName('')
      loadMembers()
    } catch (error: unknown) {
      const apiError = error as { message?: string }
      setMessage({
        type: 'error',
        text: apiError.message || 'Error al agregar miembro',
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Nombre de la cuenta
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Cambia el nombre de tu cuenta
          </p>
        </div>

        <div className="p-4">
          <form onSubmit={handleSaveName} className="space-y-4">
            <Input
              id="accountName"
              type="text"
              label="Nombre de la cuenta"
              name="name"
              defaultValue={account?.name || ''}
              required
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Agregar miembro
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Escribe el email y nombre del usuario que quieres agregar
          </p>
        </div>

        <div className="p-4">
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="memberEmail"
                type="email"
                label="Email del usuario"
                placeholder="juan@email.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
              />
              <Input
                id="memberName"
                type="text"
                label="Nombre del usuario"
                placeholder="Juan"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isAddingMember}>
              {isAddingMember ? 'Agregando...' : 'Agregar miembro'}
            </Button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Miembros de la cuenta
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>

        <div className="p-4">
          {isLoadingMembers ? (
            <div className="text-center py-4 text-sm text-gray-500">Cargando...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No hay miembros en esta cuenta
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {member.role === 'owner' ? 'Propietario' : 'Miembro'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
