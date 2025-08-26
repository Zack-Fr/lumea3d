module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
  overrides: [
    {
      files: ['**/*.module.css'],
      rules: {
        'selector-class-pattern': '^[a-z][a-zA-Z0-9-]*$'
      }
    }
  ]
}