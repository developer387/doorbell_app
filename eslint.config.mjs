import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactNativePlugin from 'eslint-plugin-react-native';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
    // Ignore patterns
    {
        ignores: [
            'node_modules/**',
            '.expo/**',
            'dist/**',
            'build/**',
            'coverage/**',
            '*.config.js',
            '*.config.ts',
        ],
    },

    // Base JavaScript recommended rules
    js.configs.recommended,

    // TypeScript recommended rules
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    // Global configuration
    {
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
    },

    // React and React Native configuration
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-native': reactNativePlugin,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // React rules
            'react/react-in-jsx-scope': 'off', // Not needed in React Native
            'react/prop-types': 'off', // Using TypeScript for prop validation
            'react/display-name': 'warn',
            'react/jsx-key': 'error',
            'react/jsx-no-duplicate-props': 'error',
            'react/jsx-no-undef': 'error',
            'react/jsx-uses-react': 'off',
            'react/jsx-uses-vars': 'error',
            'react/no-children-prop': 'error',
            'react/no-danger-with-children': 'error',
            'react/no-deprecated': 'warn',
            'react/no-direct-mutation-state': 'error',
            'react/no-find-dom-node': 'error',
            'react/no-is-mounted': 'error',
            'react/no-render-return-value': 'error',
            'react/no-string-refs': 'error',
            'react/no-unescaped-entities': 'warn',
            'react/no-unknown-property': 'error',
            'react/no-unsafe': 'warn',
            'react/require-render-return': 'error',

            // React Native specific rules
            'react-native/no-unused-styles': 'warn',
            'react-native/split-platform-components': 'warn',
            'react-native/no-inline-styles': 'off',
            'react-native/no-color-literals': 'off',
            'react-native/no-raw-text': 'off', // Can be enabled if needed

            // TypeScript rules
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                },
            ],
            '@typescript-eslint/no-misused-promises': [
                'error',
                {
                    checksVoidReturn: false,
                },
            ],

            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'all'],
            'no-throw-literal': 'error',
            'prefer-template': 'warn',
            'object-shorthand': 'warn',
            'no-nested-ternary': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'warn'
        },
    },

    prettierConfig,
);
