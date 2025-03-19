export default {
    preset: "jest-expo",
    testEnvironment: "node",
    setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
    transform: {
      "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
    },
    transformIgnorePatterns: [
      "node_modules/(?!(react-native|@react-native|expo|@expo(nent)?/.*|@react-native-community|react-navigation|@react-navigation/.*))",
    ],
    collectCoverage: true,
    coverageDirectory: "./coverage",
    coverageReporters: ["json", "lcov", "text", "clover"],
    reporters: [
      "default",
      [
        "jest-junit",
        {
          outputDirectory: "./test-results",
          outputName: "junit.xml",
        },
      ],
    ],
    testPathIgnorePatterns: [
      "/node_modules/",
      "/__tests__/helpers/"
    ],
  };
