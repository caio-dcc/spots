#!/bin/bash

# 🔍 Spotlight Dead Code Analyzer
# Finds files that are not imported/referenced anywhere
# Run with: bash .claude/analyze-deadcode.sh

echo "🔍 Dead Code Analysis"
echo "===================="
echo ""
echo "Analyzing files that may not be referenced..."
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

# Check for unused components
echo "📦 Checking for unused React components..."
echo ""

for file in "$SRC_DIR"/components/*.tsx; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    # Count imports of this component (excluding the file itself)
    count=$(grep -r "import.*$filename" "$SRC_DIR" 2>/dev/null | grep -v "$file" | wc -l)
    count=$((count + $(grep -r "from.*components" "$SRC_DIR" 2>/dev/null | grep "$filename" | grep -v "$file" | wc -l)))

    if [ "$count" -eq 0 ]; then
      echo "⚠️  Unused: $filename (0 imports)"
    fi
  fi
done

echo ""
echo "📝 Checking for unused utility files..."
echo ""

for file in "$SRC_DIR"/lib/*.ts; do
  if [ -f "$file" ]; then
    filename=$(basename "$file" .ts)
    # Count imports of this file
    count=$(grep -r "from.*lib/$filename" "$SRC_DIR" 2>/dev/null | wc -l)
    count=$((count + $(grep -r "import.*$filename" "$SRC_DIR" 2>/dev/null | wc -l)))

    # Exclude index files and commonly imported files
    if [ "$count" -eq 0 ] && [ "$filename" != "utils" ] && [ "$filename" != "index" ]; then
      echo "⚠️  Unused: lib/$filename (0 imports)"
    fi
  fi
done

echo ""
echo "🛣️  Checking for unreachable routes..."
echo ""

ROUTES_COUNT=0
UNREACHABLE_COUNT=0

for dir in "$SRC_DIR"/app/*/; do
  route_name=$(basename "$dir")

  # Skip if it's api or dashboard (protected routes)
  if [ "$route_name" != "api" ] && [ "$route_name" != "dashboard" ]; then
    # Check if there's any navigation link to this route
    count=$(grep -r "$route_name" "$SRC_DIR" 2>/dev/null | grep -v "node_modules" | wc -l)

    if [ "$count" -eq 0 ]; then
      echo "⚠️  Unreachable route: /$route_name"
      ((UNREACHABLE_COUNT++))
    fi
  fi
  ((ROUTES_COUNT++))
done

echo ""
echo "✅ Analysis complete!"
echo ""
echo "📊 Summary:"
echo "   • TypeScript files analyzed in src/"
echo "   • Check output above for unused/unreachable items"
echo "   • Routes with 0 links may still be intentional"
echo ""
echo "💡 Tips:"
echo "   • Verify unused items manually before deletion"
echo "   • Some components may be dynamically imported"
echo "   • Some routes may have direct links (not checked)"
echo ""
echo "🗑️  To remove dead code:"
echo "   1. Verify the file is truly unused"
echo "   2. Search entire codebase for references"
echo "   3. Delete file"
echo "   4. Run 'npm run build' to verify no errors"
