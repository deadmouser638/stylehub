#!/bin/bash

echo "=============================================="
echo "      Welcome to StyleHub Application"
echo "=============================================="

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/."
    exit 1
fi

# Check and Install Backend Dependencies
echo "Checking Server Dependencies..."
cd server || exit
if [ ! -d "node_modules" ]; then
    echo "Installing Server Dependencies..."
    npm install
fi

# Seed Database if not exists
if [ ! -f "database.sqlite" ]; then
    echo "Seeding the Database..."
    npm run seed
fi
cd .. || exit

# Check and Install Frontend Dependencies
echo "Checking Client Dependencies..."
cd client || exit
if [ ! -d "node_modules" ]; then
    echo "Installing Client Dependencies..."
    npm install
fi
cd .. || exit

# Start Backend and Frontend
echo "Starting Backend Server..."
cd server && npm run dev &
SERVER_PID=$!

echo "Starting Frontend Application..."
cd client && npm run dev &
CLIENT_PID=$!

# Open Browser
echo "Waiting for services to boot..."
sleep 5

if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
else
    echo "Please open your browser to http://localhost:5173"
fi

echo "StyleHub is running! Press Ctrl+C to stop."

# Wait for background processes
wait $SERVER_PID
wait $CLIENT_PID
