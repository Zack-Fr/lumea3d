const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  {
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Basic rules
      'no-unused-vars': 'off',
      'no-console': 'warn',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-explicit-module-boundary-types': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.js'],
  },
];