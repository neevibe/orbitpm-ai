#!/bin/bash
# OrbitPM AI - Automated QA Pre-Deploy Pipeline Script
# Maintained by QA & Release Management Agent

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0;3m' # No Color
BLUE='\033[0;34m'

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}       ORBITPM AI — PRE-DEPLOY QA PIPELINE          ${NC}"
echo -e "${BLUE}===================================================${NC}"

# Step 1: Install Dependencies (Sanity check)
echo -e "\n${YELLOW}[Step 1/4] Checking Node modules...${NC}"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}node_modules not found. Installing...${NC}"
  npm install
else
  echo -e "${GREEN}✓ Node modules already installed.${NC}"
fi

# Step 2: Run TypeScript Compiler Check
echo -e "\n${YELLOW}[Step 2/4] Running TypeScript validation...${NC}"
if npx tsc --noEmit; then
  echo -e "${GREEN}✓ TypeScript compilation check passed.${NC}"
else
  echo -e "${RED}❌ TypeScript validation failed.${NC}"
  exit 1
fi

# Step 3: Run Next.js Linting
echo -e "\n${YELLOW}[Step 3/4] Running ESLint check...${NC}"
if npm run lint; then
  echo -e "${GREEN}✓ ESLint checks passed.${NC}"
else
  echo -e "${RED}❌ ESLint checks failed.${NC}"
  exit 1
fi

# Step 4: Run Production Build
echo -e "\n${YELLOW}[Step 4/4] Building Next.js application...${NC}"
if npm run build; then
  echo -e "${GREEN}✓ Production build compiled successfully.${NC}"
else
  echo -e "${RED}❌ Production build failed.${NC}"
  exit 1
fi

echo -e "\n${GREEN}===================================================${NC}"
echo -e "${GREEN}  QA PIPELINE SUCCESSFUL — READY FOR DEPLOYMENT      ${NC}"
echo -e "${GREEN}===================================================${NC}"
exit 0
