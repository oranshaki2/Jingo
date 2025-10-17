#!/usr/bin/env bash
# ===============================================
# 🚀 Start server + LocalTunnel + Expo (with cleanup & port pre-check)
# ===============================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
APP_DIR="$ROOT_DIR/myApp"
LT_LOG="/tmp/localtunnel.log"

SERVER_PID=""
LT_PID=""

# --- Helpers ---

kill_port() {
  # Kill whatever listens on a given TCP port (Linux/WSL-friendly).
  local port="${1:-}"
  if [[ -z "$port" ]]; then return 0; fi

  echo "🔎 Checking if anything is listening on port $port..."
  if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti tcp:"$port" || true)
    if [[ -n "$PIDS" ]]; then
      echo "🛑 Killing PIDs on port $port: $PIDS"
      kill -9 $PIDS || true
    else
      echo "✅ Port $port is free."
    fi
  elif command -v fuser >/dev/null 2>&1; then
    if fuser "$port"/tcp >/dev/null 2>&1; then
      echo "🛑 Killing processes on port $port via fuser..."
      fuser -k "$port"/tcp || true
    else
      echo "✅ Port $port is free."
    fi
  else
    # Fallback: try ss to locate PID (may require sudo to kill)
    if command -v ss >/dev/null 2>&1; then
      PID=$(ss -ltnp | awk -v p=":${port}" '$4 ~ p {print $NF}' | sed 's/.*pid=\([0-9]\+\).*/\1/' | head -n1)
      if [[ -n "${PID:-}" ]]; then
        echo "🛑 Killing PID $PID on port $port (ss fallback)..."
        kill -9 "$PID" || true
      else
        echo "✅ Port $port is free."
      fi
    else
      echo "⚠️ Could not verify or free port $port (no lsof/fuser/ss)."
    fi
  fi
}

cleanup() {
  echo
  echo "🧹 Cleaning up..."
  if [[ -n "${LT_PID:-}" ]] && ps -p "$LT_PID" >/dev/null 2>&1; then
    echo "⛔ Stopping LocalTunnel (PID $LT_PID)"
    kill "$LT_PID" || true
  fi
  if [[ -n "${SERVER_PID:-}" ]] && ps -p "$SERVER_PID" >/dev/null 2>&1; then
    echo "⛔ Stopping Node server (PID $SERVER_PID)"
    kill "$SERVER_PID" || true
  fi
  echo "✅ Done."
}
trap cleanup EXIT

require_dir() {
  if [[ ! -d "$1" ]]; then
    echo "❌ Missing directory: $1"
    exit 1
  fi
}

# --- Pre-flight checks ---
require_dir "$SERVER_DIR"
require_dir "$APP_DIR"

command -v node >/dev/null 2>&1 || { echo "❌ 'node' is required."; exit 1; }
command -v npx  >/dev/null 2>&1 || { echo "❌ 'npx' is required."; exit 1; }

# --- Step 0: Free the server port ---
kill_port 3000

# --- Step 1: Start the Node.js server in background ---
echo "🟢 Starting Node.js server..."
cd "$SERVER_DIR"
node app.js &
SERVER_PID=$!
echo "➡️ Server PID: $SERVER_PID"

# Give the server a moment to boot
sleep 3

# --- Step 2: Start LocalTunnel and capture its URL ---
echo "🌐 Starting LocalTunnel on port 3000..."
: > "$LT_LOG"
# --print-requests keeps outputting; we run it in background and parse the log
npx localtunnel --port 3000 --print-requests >"$LT_LOG" 2>&1 &
LT_PID=$!
echo "➡️ LocalTunnel PID: $LT_PID"

# Wait up to ~30s for a URL to appear
LT_URL=""
for i in {1..30}; do
  if grep -Eo 'https://[a-z0-9.-]+\.loca\.lt' "$LT_LOG" >/dev/null 2>&1; then
    LT_URL=$(grep -Eo 'https://[a-z0-9.-]+\.loca\.lt' "$LT_LOG" | head -n1)
    break
  fi
  sleep 1
done

if [[ -z "$LT_URL" ]]; then
  echo "❌ Could not retrieve LocalTunnel URL."
  echo "─── LocalTunnel log ───"
  tail -n +1 "$LT_LOG" || true
  exit 1
fi

echo "✅ LocalTunnel URL: $LT_URL"

# --- Step 3: Update .env.local with the new API URL ---
cd "$ROOT_DIR"
ENV_FILE="$APP_DIR/.env.local"
echo "EXPO_PUBLIC_API_URL=${LT_URL}/api" > "$ENV_FILE"
echo "📁 Wrote to $ENV_FILE:"
cat "$ENV_FILE"

# --- Step 4: Start the Expo app (tunnel mode) ---
echo "🎵 Starting Expo app with tunnel..."
cd "$APP_DIR"
npx expo start -c --tunnel
