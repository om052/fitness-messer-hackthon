/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const AsyncStorage = require('@react-native-async-storage/async-storage');

// The AsyncStorage mock keeps its store in memory for the whole test file.
// Clearing it between tests keeps each case isolated.
beforeEach(async () => {
  await AsyncStorage.clear();
});
