// The app prints session IDs and user rows with console.log.
// This keeps the test output readable.
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
