// stores/disclaimersStore.ts
// Zustand store para controlar la visibilidad de disclaimers

import { create } from 'zustand'

export const useDisclaimersStore = create<{
  showRecommendations: boolean
  showChat: boolean
  visible: boolean
  toggle: () => void
}>((set) => ({
  showRecommendations: true,
  showChat: true,
  get visible() {
    return this.showRecommendations || this.showChat
  },
  toggle: () => set((state) => ({
    showRecommendations: !state.showRecommendations,
    showChat: !state.showChat
  })),
}))
