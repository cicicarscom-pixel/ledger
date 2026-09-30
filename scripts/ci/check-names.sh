#!/usr/bin/env bash
set -e
echo "Checking for undefined names and syntax..."
if [ -d "src" ]; then
    # if grep returns 1 (no lines matched), we shouldn't fail.
    # set +e before grep
    set +e
    output=$(grep -rnE 'undefined is not a function|SyntaxError' src/ 2>/dev/null)
    exit_code=$?
    set -e
    if [ $exit_code -eq 0 ] && [ ! -z "$output" ]; then
        echo "Found potential issues:"
        echo "$output"
        exit 1
    fi
fi
echo "Check names passed."
