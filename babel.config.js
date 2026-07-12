module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.jsx', '.js', '.json'],
        alias: {
          '@components': './src/presentation/components',
          '@screens': './src/presentation/screens',
          '@navigation': './src/presentation/navigation',
          '@theme': './src/presentation/theme',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@store': './src/store',
          '@utils': './src/utils',
          '@native': './src/native',
          '@database': './src/database',
          '@app-types': './src/types',
          '@assets': './src/assets',
        },
      },
    ],
    // react-native-reanimated/plugin must be listed last
    'react-native-reanimated/plugin',
  ],
};
