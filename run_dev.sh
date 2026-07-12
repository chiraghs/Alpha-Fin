#!/bin/bash

# ========================================================
# ALPHA-FIN HACKATHON PROTO-LAUNCHER
# Starts backend FastAPI and serves frontend simulator UI
# ========================================================

# Colors for terminal outputs
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================================${NC}"
echo -e "${CYAN}             ALPHA-FIN SANDBOX DEV LAUNCHER             ${NC}"
echo -e "${CYAN}========================================================${NC}"

# Check python version
python3 --version >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: python3 is required but not installed.${NC}"
    exit 1
fi

# 1. Setup Virtual Environment
cd backend
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment (venv)...${NC}"
    python3 -m venv venv
fi

echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

echo -e "${YELLOW}Installing dependencies from requirements.txt...${NC}"
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to install python dependencies.${NC}"
    exit 1
fi

# 2. Seed Database
echo -e "${YELLOW}Running database seed script...${NC}"
python seed.py
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Database seeding failed.${NC}"
    exit 1
fi
cd ..

# 3. Launch Services
echo -e "${YELLOW}Starting FastAPI Backend Service on port 8000...${NC}"
source backend/venv/bin/activate
uvicorn backend.app.main:app --reload --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${YELLOW}Starting Frontend HTTP server on port 3000...${NC}"
cd frontend
python3 -m http.server 3000 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Function to clean up background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping background servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Servers successfully shut down.${NC}"
    exit 0
}

# Trap Ctrl+C (SIGINT) and exit signals to run cleanup
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}🚀 Application is running successfully!${NC}"
echo -e "${CYAN}👉 Frontend Dashboard: http://localhost:3000${NC}"
echo -e "${CYAN}👉 Swagger API Docs:   http://localhost:8000/docs${NC}"
echo -e "${GREEN}========================================================${NC}"
echo -e "${YELLOW}Press Ctrl+C to terminate services.${NC}"

# Keep script running to maintain processes
while true; do
    sleep 1
done
