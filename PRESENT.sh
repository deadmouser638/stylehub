#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/server"
npm ci --omit=dev --no-audit --no-fund
node server.js
