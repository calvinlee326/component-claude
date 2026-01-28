write comperhensive tests for: $ARGUMENTS

Testing conventions:
* use vitests with React Testing Library
* place test files in a __tests__ directory in the same folder as the source file
* name test files as [filename].test.ts(x)
* use @/ prefix for imports

Coverage:
* Test happy paths
* Test edge cases
* Test error states
* Focus on testing behavior and public API's rather than implementation