import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', '.discord-inventory/**'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
);
