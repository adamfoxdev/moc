#!/bin/sh
# Copies the page next to the Dockerfile (so it is inside the build context), then deploys.
set -eu
cd "$(dirname "$0")"
cp ../index.html ./index.html
trap 'rm -f ./index.html' EXIT
fly deploy --ha=false "$@"
