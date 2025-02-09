module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transform: {
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      { plugins: ['babel-plugin-syntax-hermes-parser'] },
    ],
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo(nent)?/.*|@react-native-community|react-navigation|@react-navigation/.*))',
  ],
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  reporters: [
    'default', // Keep the default console output
    [
      'jest-junit',
      {
        outputDirectory: './test-results', // Directory for JUnit results
        outputName: 'junit.xml', // File name for JUnit results
      },
    ],
  ],
}
