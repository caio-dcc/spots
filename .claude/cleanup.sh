#!/bin/bash

# 🧹 Spotlight Local Cleanup Script
# Clears cache, dependencies, and temp files while keeping source code
# Safe to run frequently
# Run with: bash .claude/cleanup.sh

set -e

echo "🧹 Spotlight Local Cleanup"
echo "=========================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Disk usage before cleanup:${NC}"
du -sh "$PROJECT_ROOT" 2>/dev/null || echo "N/A"
echo ""

# Clear .next build cache
if [ -d "$PROJECT_ROOT/.next" ]; then
  echo -e "${YELLOW}Removing .next build cache...${NC}"
  SIZE=$(du -sh "$PROJECT_ROOT/.next" 2>/dev/null | cut -f1)
  rm -rf "$PROJECT_ROOT/.next"
  echo -e "${GREEN}✓ Freed: $SIZE${NC}"
fi

# Remove TypeScript build info
if [ -f "$PROJECT_ROOT/tsconfig.tsbuildinfo" ]; then
  echo -e "${YELLOW}Removing TypeScript build cache...${NC}"
  rm "$PROJECT_ROOT/tsconfig.tsbuildinfo"
  echo -e "${GREEN}✓ Removed${NC}"
fi

# Clear logs
if [ -d "$PROJECT_ROOT/logs" ]; then
  echo -e "${YELLOW}Clearing log files...${NC}"
  find "$PROJECT_ROOT/logs" -type f -delete 2>/dev/null || true
  echo -e "${GREEN}✓ Logs cleared${NC}"
fi

# Clean temporary files
echo -e "${YELLOW}Removing temporary files...${NC}"
TEMP_COUNT=0

# Remove .tmp files
while IFS= read -r -d '' file; do
  rm "$file"
  ((TEMP_COUNT++))
done < <(find "$PROJECT_ROOT" -type f -name "*.tmp" -print0 2>/dev/null)

# Remove .DS_Store (macOS)
while IFS= read -r -d '' file; do
  rm "$file"
  ((TEMP_COUNT++))
done < <(find "$PROJECT_ROOT" -type f -name ".DS_Store" -print0 2>/dev/null)

# Remove Thumbs.db (Windows)
while IFS= read -r -d '' file; do
  rm "$file"
  ((TEMP_COUNT++))
done < <(find "$PROJECT_ROOT" -type f -name "Thumbs.db" -print0 2>/dev/null)

if [ "$TEMP_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Removed $TEMP_COUNT temp files${NC}"
else
  echo -e "${GREEN}✓ No temp files found${NC}"
fi

# Clear npm cache
echo -e "${YELLOW}Clearing npm cache...${NC}"
npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✓ npm cache cleared${NC}"

# Remove lock files backup
if [ -f "$PROJECT_ROOT/package-lock.json.bak" ]; then
  echo -e "${YELLOW}Removing backup lock files...${NC}"
  rm "$PROJECT_ROOT/package-lock.json.bak"
  echo -e "${GREEN}✓ Backup removed${NC}"
fi

# Cleanup complete
echo ""
echo -e "${BLUE}📊 Disk usage after cleanup:${NC}"
du -sh "$PROJECT_ROOT" 2>/dev/null || echo "N/A"
echo ""

echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "🔧 To rebuild after cleanup:"
echo "   npm install    # (if node_modules was cleaned)"
echo "   npm run build  # Rebuild Next.js"
echo "   npm run dev    # Start development server"
