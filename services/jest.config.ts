import type { JestConfigWithTsJest } from 'ts-jest'

/** References:
 * https://jestjs.io/docs/configuration
 * https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
 */

const jestConfig: JestConfigWithTsJest = {
	preset: 'ts-jest/presets/default-esm', //'ts-jest', //'ts-jest/presets/default',
	// testEnvironment: 'node',
	// extensionsToTreatAsEsm: ['.ts'],
	bail: true,
	verbose: true,
	clearMocks: true,
	testTimeout: 30_000,
	// globals: {
	// 	'ts-jest': {
	// 		useESM: true,
	// 	},
	// },
}
export default jestConfig
