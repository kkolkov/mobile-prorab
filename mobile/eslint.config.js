const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([expo, { ignores: ['dist/**', '.expo/**', 'tests/**'] }, {
  files: ['src/app/wizard/*.tsx', 'src/app/refinement/*.tsx'],
  rules: { 'react-hooks/immutability': 'off', 'react-hooks/set-state-in-effect': 'off' },
}]);
