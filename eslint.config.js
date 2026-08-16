import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import boundariesPlugin from 'eslint-plugin-boundaries';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.firebase/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      boundaries: boundariesPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**/*' },
        { type: 'application', pattern: 'src/application/**/*' },
        { type: 'infrastructure', pattern: 'src/lib/**/*' },
        { type: 'presentation', pattern: 'src/components/**/*' },
        { type: 'presentation', pattern: 'src/App.tsx' },
        { type: 'presentation', pattern: 'src/main.tsx' },
      ],
    },
    rules: {
      // Katman sınırları (AI-RULES §2) - Error
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'presentation',
              disallow: ['infrastructure'],
              message: 'Presentation katmanı infrastructure katmanını doğrudan import edemez.',
            },
            {
              from: 'domain',
              disallow: ['infrastructure', 'application', 'presentation'],
              message: 'Domain katmanı iç/dış katmanlara bağımlı olamaz.',
            },
          ],
        },
      ],

      // ABACUS dışı formatlama/hesap yasakları (AI-RULES §3.8) - Error
      'no-restricted-properties': [
        'error',
        {
          property: 'toLocaleString',
          message: 'toLocaleString kullanımı yasaktır. Lütfen ABACUS motorunu (money/date) kullanın.',
        },
        {
          property: 'toLocaleDateString',
          message: 'toLocaleDateString kullanımı yasaktır. Lütfen ABACUS date motorunu kullanın.',
        },
        {
          property: 'toLocaleTimeString',
          message: 'toLocaleTimeString kullanımı yasaktır. Lütfen ABACUS date motorunu kullanın.',
        },
        {
          property: 'toFixed',
          message: 'toFixed kullanımı yasaktır. Lütfen ABACUS math/money motorunu kullanın.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Intl',
          message: 'Intl kullanımı yasaktır. Lütfen ABACUS motorlarını kullanın.',
        },
      ],
    },
  },
  {
    files: ['src/domain/abacus/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': 'off',
      'no-restricted-globals': 'off',
    },
  },
];
