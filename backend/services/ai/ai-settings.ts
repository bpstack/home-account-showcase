// services/ai/ai-settings.ts
// Persistent AI settings management

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { AIProviderType } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Settings file path (in backend root)
const SETTINGS_FILE = path.join(__dirname, '../../.ai-settings.json')

interface AISettings {
  activeProvider: AIProviderType
  updatedAt: string
}

const DEFAULT_SETTINGS: AISettings = {
  activeProvider: 'none',
  updatedAt: new Date().toISOString(),
}

/**
 * Load settings from file
 */
function loadSettings(): AISettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      settingsFileExists = true
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      const settings = JSON.parse(data) as AISettings
      return settings
    }
  } catch (error) {
    console.warn('[AI Settings] Error loading settings:', error)
  }
  settingsFileExists = false
  return { ...DEFAULT_SETTINGS }
}

/**
 * Save settings to file
 */
function saveSettings(settings: AISettings): void {
  try {
    settings.updatedAt = new Date().toISOString()
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
    settingsFileExists = true
    console.log(`[AI Settings] Saved: ${settings.activeProvider}`)
  } catch (error) {
    console.error('[AI Settings] Error saving settings:', error)
  }
}

// In-memory cache
let cachedSettings: AISettings | null = null
let settingsFileExists: boolean = false

/**
 * Check if settings file exists (user has made a selection)
 */
export function hasPersistedSettings(): boolean {
  return settingsFileExists
}

/**
 * Get the persisted active provider
 */
export function getPersistedProvider(): AIProviderType {
  if (!cachedSettings) {
    cachedSettings = loadSettings()
  }
  return cachedSettings.activeProvider
}

/**
 * Set and persist the active provider
 */
export function setPersistedProvider(provider: AIProviderType): void {
  cachedSettings = {
    activeProvider: provider,
    updatedAt: new Date().toISOString(),
  }
  saveSettings(cachedSettings)
}

/**
 * Initialize settings on startup
 */
export function initializeAISettings(): void {
  cachedSettings = loadSettings()
  console.log(`[AI Settings] Initialized with provider: ${cachedSettings.activeProvider}`)
}
