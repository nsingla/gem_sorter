#!/usr/bin/env bash
#
# Run all unit tests using Node.js built-in test runner (node:test).
# Requires Node >= 18. No npm install needed.
#
# Usage:
#   ./tests/run-tests.sh              # run all tests with spec reporter
#   ./tests/run-tests.sh --watch      # re-run on file changes
#
# Individual test files:
#   node --test --test-reporter=spec tests/gem.test.js
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Gem Sorter — Test Suite ==="
echo ""

node --test --test-reporter=spec \
  tests/gem.test.js \
  tests/slot.test.js \
  tests/conveyor.test.js \
  tests/robotic-arm.test.js \
  tests/program-runner.test.js \
  tests/block-definitions.test.js \
  tests/levels.test.js \
  tests/level-manager.test.js \
  tests/game-engine.test.js
