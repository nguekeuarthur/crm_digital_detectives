module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  extends: ['standard', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    {
      files: ['packages/web/**/*.{js,jsx}'],
      env: {
        browser: true,
        node: false
      },
      extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended', 'prettier'],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off'
      }
    }
  ]
}
