#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run src/app.js from the script's directory, passing all arguments
node "$SCRIPT_DIR/src/app.js" "$@"

# Return the exit code of the node process
exit $?
