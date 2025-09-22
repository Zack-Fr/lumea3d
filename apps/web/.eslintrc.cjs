module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['@typescript-eslint', 'react-refresh'],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  globals: {
    React: 'readonly',
    THREE: 'readonly',
    RequestInit: 'readonly',
    RequestInfo: 'readonly',
    EventListener: 'readonly',
    globalThis: 'readonly',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-explicit-module-boundary-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'react-refresh/only-export-components': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-unused-vars': 'off',
    'no-empty': 'off',
    'no-empty-pattern': 'off',
    'no-useless-escape': 'off',
    'no-case-declarations': 'off',
    'no-extra-semi': 'off',
    'prefer-const': 'off',
    'no-redeclare': 'off',
    'no-undef': 'off',
  },
  reportUnusedDisableDirectives: false,
  ignorePatterns: [
    'dist/', 
    'node_modules/', 
    '*.js', 
    '*.d.ts',
    'legacy/**/*',
    'tailwind.config.ts',
    'vite.config.ts'
  ],
};
