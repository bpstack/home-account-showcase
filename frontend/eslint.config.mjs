import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default defineConfig([
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  prettierRecommended,
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
      // React Compiler rules from eslint-plugin-react-hooks 7. The project does not use the
      // React Compiler, and these two flag render performance, not bugs. Turn them back on
      // if the compiler is adopted (frontend/AGENTS.md, declared exception).
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Carried over from the old .eslintignore
    '**/_backup_*/',
    '**/*.disabled*.ts',
    '_archive/',
    'tailwind.config.ts',
  ]),
])
