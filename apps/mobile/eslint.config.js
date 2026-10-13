const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  { ignores: ['ios/**', 'android/**', 'dist/**', '**/*.generated.ts'] },
  { files: ['src/**/*.{ts,tsx}'], rules: { 'import/no-cycle': 'error' } },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'expo*',
                '**/data/*',
                '**/features/*',
                '**/ui/*',
                '**/modules/*',
                '**/services',
              ],
              message: 'Domain rules and use cases depend only on pure domain types and ports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['expo-sqlite', '**/data/*', '**/modules/*'],
              message:
                'Use the injected AppServices boundary; views must not access SQL or native module wiring.',
            },
          ],
        },
      ],
    },
  },
]);
