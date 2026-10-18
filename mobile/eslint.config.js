const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([expo, { ignores: ['dist/**', '.expo/**', 'tests/**'] }, {
  files: ['src/app/wizard/*.tsx', 'src/app/refinement/*.tsx'],
  // These screens intentionally edit the in-memory session store and explicitly redraw.
  // Keep React Compiler off for this architecture; retain the standard hook checks.
  rules: { 'react-hooks/immutability': 'off', 'react-hooks/set-state-in-effect': 'off' },
}]);
