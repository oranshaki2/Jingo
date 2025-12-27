#!/bin/bash

# Function to clean up background processes when the script exits or is interrupted
cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  # Kill all child processes started by this script
  pkill -P $$
  echo "✅ All background processes stopped."
  exit 0
}

# Run the cleanup function when Ctrl+C (SIGINT) is pressed
trap cleanup SIGINT

# Ensure required tools exist
command -v jq >/dev/null 2>&1 || { echo "❌ 'jq' is required (sudo apt install jq)"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "❌ 'curl' is required (sudo apt install curl)"; exit 1; }

# Navigate to the server directory
cd server || { echo "❌ Couldn't find 'server' directory"; exit 1; }

# Start the API server with nodemon in the background
echo "🚀 Starting API server..."
node app.js &
DEV_PID=$!

# Go back to the project root
cd ..

# Start ngrok to expose the local API to the internet
echo "🌍 Starting ngrok tunnel for port 3000..."
ngrok http 3000 > /tmp/ngrok.log &
echo "⏳ Waiting for ngrok tunnel..."

for i in {1..10}; do
  URL=$(curl -s http://127.0.0.1:4040/api/tunnels \
    | jq -r '.tunnels[]?.public_url' \
    | grep https)

  if [ -n "$URL" ]; then
    break
  fi

  sleep 1
done

if [ -z "$URL" ]; then
  echo "❌ Could not retrieve ngrok URL after waiting."
  cleanup
fi
# Validate the URL
if [ -z "$URL" ] || [ "$URL" = "null" ]; then
  echo "❌ Could not retrieve ngrok URL. Is ngrok running and authtoken configured?"
  cleanup
fi

# Update root .env.local with just the API URL
echo "EXPO_PUBLIC_API_URL=${URL}/api" > .env.local

# Preserve Gemini API key from myApp/.env.local if it exists
GEMINI_KEY=$(grep EXPO_PUBLIC_GEMINI_API_KEY myApp/.env.local 2>/dev/null || echo "")

# Update myApp/.env.local with API URL and preserve Gemini key
echo "EXPO_PUBLIC_API_URL=${URL}/api" > myApp/.env.local
if [ ! -z "$GEMINI_KEY" ]; then
  echo "$GEMINI_KEY" >> myApp/.env.local
fi

echo "🌐 API URL set to: ${URL}/api"

# Start Expo in tunnel mode (foreground so you can see logs/QR)
echo "📦 Starting Expo (tunnel mode)..."
# Move into the myApp directory
cd myApp || { echo "❌ Couldn't find 'myApp' directory"; cleanup; }
npx expo start --tunnel

# If Expo exits normally, clean up background processes before leaving
cleanup