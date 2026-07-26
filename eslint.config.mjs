import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'benchmark_toTasks.ts',
      // Vendored shadcn/ui primitives — kept as generated, not linted as our code.
      'components/ui/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Screenshots are user-pasted base64 data URLs and `images.unoptimized` is on,
      // so next/image would add nothing here.
      '@next/next/no-img-element': 'off',
      // React Compiler rule, new in Next 16. It flags a pre-existing set of
      // mount-time sync effects (localStorage/media-query/theme subscriptions).
      // Kept visible as warnings; converting them to useSyncExternalStore is a
      // separate refactor, not a silent exemption.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Tests deliberately poke at loosely typed internals.
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default config
