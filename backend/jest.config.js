export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      '../node_modules/ts-jest',
      {
        useESM: true,
      },
    ],
  },
};
