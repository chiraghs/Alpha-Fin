#!/bin/bash
# ============================================================
#  PROSPECT ASSIST AI — ONE-COMMAND LAUNCHER
#  Starts the FastAPI backend (:8000) and the Next.js
#  frontend (:3000) together.
#
#    ./start.sh            local dev  (python venv + next dev)
#    ./start.sh --docker   containers (docker compose up --build)
#
#  Ports can be overridden if something else already uses them:
#    BACKEND_PORT=8010 FRONTEND_PORT=3100 ./start.sh
# ============================================================
set -u
cd "$(dirname "$0")"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

banner() {
  echo -e "${CYAN}========================================================${NC}"
  echo -e "${CYAN}   PROSPECT ASSIST AI · IDBI INNOVATE 2026 · TRACK 02   ${NC}"
  echo -e "${CYAN}========================================================${NC}"
}

lan_ip() {
  # best-effort LAN address so the app can be opened from a phone
  ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}'
}

print_urls() {
  local ip
  ip=$(lan_ip)
  echo -e "${GREEN}========================================================${NC}"
  echo -e "${GREEN}🚀 Application is running${NC}"
  echo -e "${CYAN}👉 Frontend (RM Hub):   http://localhost:${FRONTEND_PORT}${NC}"
  echo -e "${CYAN}👉 Backend Swagger:     http://localhost:${BACKEND_PORT}/docs${NC}"
  if [ -n "${ip:-}" ]; then
    echo -e "${CYAN}📱 On your phone (same Wi-Fi): http://${ip}:${FRONTEND_PORT}${NC}"
  fi
  echo -e "${GREEN}========================================================${NC}"
}

port_in_use() { lsof -i :"$1" -sTCP:LISTEN >/dev/null 2>&1; }

require_free_port() {
  if port_in_use "$1"; then
    echo -e "${RED}Error: port $1 is already in use by:${NC}"
    lsof -i :"$1" -sTCP:LISTEN -P | tail -n +2 | awk '{print "   "$1" (pid "$2")"}' | sort -u
    echo -e "${YELLOW}Free the port, or rerun with overrides, e.g.: BACKEND_PORT=8010 FRONTEND_PORT=3100 ./start.sh${NC}"
    exit 1
  fi
}

banner

# ---------------- Docker mode ----------------
if [ "${1:-}" = "--docker" ]; then
  if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Start Docker Desktop and retry.${NC}"
    exit 1
  fi
  echo -e "${YELLOW}Building & starting containers (backend :8000, frontend :3000)...${NC}"
  print_urls
  exec docker compose up --build
fi

# ---------------- Local dev mode ----------------
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Error: python3 is required.${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: node (>=20) is required.${NC}"; exit 1; }
require_free_port "$BACKEND_PORT"
require_free_port "$FRONTEND_PORT"

# 1. Python environment + dependencies
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}Creating Python virtual environment...${NC}"
  python3 -m venv venv
fi
echo -e "${YELLOW}Installing backend dependencies...${NC}"
./venv/bin/pip install -q -r backend/requirements.txt || { echo -e "${RED}pip install failed.${NC}"; exit 1; }

# 2. Seed sandbox database
echo -e "${YELLOW}Seeding sandbox database...${NC}"
./venv/bin/python backend/seed.py || { echo -e "${RED}Database seeding failed.${NC}"; exit 1; }

# 3. Frontend dependencies
if [ ! -d "frontend-next/node_modules" ]; then
  echo -e "${YELLOW}Installing frontend dependencies (first run only)...${NC}"
  (cd frontend-next && npm install) || { echo -e "${RED}npm install failed.${NC}"; exit 1; }
fi

# 4. Launch both services
echo -e "${YELLOW}Starting FastAPI backend on :${BACKEND_PORT}...${NC}"
./venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload > backend.log 2>&1 &
BACKEND_PID=$!

# On non-default backend ports, pin the API base so the browser finds it
API_ENV=""
if [ "$BACKEND_PORT" != "8000" ]; then
  API_ENV="NEXT_PUBLIC_API_BASE=http://localhost:${BACKEND_PORT}/api"
fi

echo -e "${YELLOW}Starting Next.js frontend on :${FRONTEND_PORT}...${NC}"
(cd frontend-next && env $API_ENV npx next dev --hostname 0.0.0.0 --port "$FRONTEND_PORT" > ../frontend.log 2>&1) &
FRONTEND_PID=$!

cleanup() {
  echo -e "\n${YELLOW}Stopping services...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  # next dev spawns children; sweep anything left on our ports
  lsof -ti :"$FRONTEND_PORT" -ti :"$BACKEND_PORT" 2>/dev/null | xargs kill 2>/dev/null
  echo -e "${GREEN}All services shut down.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

sleep 3
print_urls
echo -e "${YELLOW}Logs: backend.log / frontend.log — Ctrl+C to stop.${NC}"

wait
