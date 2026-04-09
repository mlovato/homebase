@AGENTS.md

# Development Rules

- **Clean code**: All code must adhere to clean code principles — clear naming, single responsibility, no dead code, no unnecessary complexity.
- **TDD**: Features and bug fixes must be developed using a test-driven approach. Write the test first, then the implementation.
- **Tests on commit**: Run the test suite before every commit. Do not commit if tests are failing.
- **No co-author**: Never add `Co-Authored-By: Claude` or any AI co-author trailer to commit messages.
- **Restart on commit**: After every commit, kill the dev server (`pkill -f "next dev"`) and restart it (`npm --prefix /Users/mlovato/code/homebase run dev`).
