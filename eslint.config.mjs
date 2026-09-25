import js from '@eslint/js';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',
    },
  },
  {
    // Games (games/<slug>/): plain ES modules for the browser, Node scripts.
    files: ['games/*/src/**/*.js', 'games/*/scripts/**/*.js', 'games/*/vite.config.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
    },
  },
  {
    ignores: ['build/', 'node_modules/', 'config/', 'scripts/', 'games/*/dist/', 'games/*/node_modules/'],
  },
];
