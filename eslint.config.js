const react = require('eslint-plugin-react')
const reactNative = require('eslint-plugin-react-native')
const jest = require('eslint-plugin-jest')

module.exports = [
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        jest: true,
        browser: true,
        node: true,
      },
      parser: require('@babel/eslint-parser'), // Correctly require the parser
      parserOptions: {
        requireConfigFile: false, // Avoid requiring babel.config.js
        babelOptions: {
          presets: ['@babel/preset-react'], // Enable JSX support
        },
      },
    },
    plugins: {
      react,
      reactNative,
      jest,
    },
    rules: {
      'react/prop-types': 'off',
      'no-unused-vars': 'warn',
    },
  },
]
