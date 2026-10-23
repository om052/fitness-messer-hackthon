module.exports = function (api) {
  // Test-only preset: babel-preset-expo inlines EXPO_PUBLIC_* env vars at
  // transform time, so runtime env vars set in jest.env.setup.js never reach
  // modules like src/lib/supabase.ts. The plain RN preset avoids that.
  if (process.env.NODE_ENV === 'test') {
    api.cache(false);
    return {
      presets: ['@react-native/babel-preset'],
    };
  }
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
