#!/bin/bash

# 🗑️ Spotlight Tree-Shaking Script
# Removes obsolete files and consolidates documentation
# Run with: bash .claude/treeshake.sh

set -e

echo "🗑️  Spotlight Tree-Shaking & Cleanup"
echo "======================================"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE_DIR="$PROJECT_ROOT/archive"
DATETIME=$(date +%Y%m%d_%H%M%S)

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR/docs_$DATETIME"
mkdir -p "$ARCHIVE_DIR/components_$DATETIME"

echo "📦 Archiving deprecated files..."

# Archive deprecated components
DEPRECATED_COMPONENTS=(
  "src/components/KillExcelSection.tsx"
)

for file in "${DEPRECATED_COMPONENTS[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    echo "  ↪️  Archiving: $file"
    mv "$PROJECT_ROOT/$file" "$ARCHIVE_DIR/components_$DATETIME/"
  fi
done

# Archive obsolete .agents rules
echo "📄 Archiving obsolete documentation..."

DEPRECATED_DOCS=(
  ".agents/rules/cleanup.md"
  ".agents/rules/correct-modals.md"
  ".agents/rules/corrections.md"
  ".agents/rules/fluxo.md"
  ".agents/rules/styles.md"
  ".agents/rules/togit.md"
  ".agents/PROGRESSO_HOJE_04_05.md"
  ".agents/PROGRESSO_STRIPE_CONNECT.md"
  ".agents/RESUMO_EXECUTIVO_COMPLETO.md"
  ".agents/SPRINT_1_RESUMO_DECISOES.md"
  ".agents/STATUS_BILHETERIA_REAL.md"
  "RELATORIO_IMPLEMENTACAO.md"
  "RELATORIO_FINAL_IMPLEMENTACAO.md"
)

for file in "${DEPRECATED_DOCS[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    echo "  ↪️  Archiving: $file"
    mkdir -p "$ARCHIVE_DIR/docs_$DATETIME/$(dirname "$file")"
    mv "$PROJECT_ROOT/$file" "$ARCHIVE_DIR/docs_$DATETIME/$file"
  fi
done

# Clean npm cache
echo ""
echo "🧹 Cleaning caches..."
echo "  ↪️  Clearing Next.js build cache..."
rm -rf "$PROJECT_ROOT/.next" 2>/dev/null || true
echo "  ↪️  Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Remove TypeScript build info
if [ -f "$PROJECT_ROOT/tsconfig.tsbuildinfo" ]; then
  echo "  ↪️  Removing tsconfig.tsbuildinfo..."
  rm "$PROJECT_ROOT/tsconfig.tsbuildinfo"
fi

# Remove temp files
echo "  ↪️  Cleaning temp files..."
find "$PROJECT_ROOT" -name "*.tmp" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name ".DS_Store" -delete 2>/dev/null || true

# Create .gitignore entries for build artifacts if needed
if ! grep -q ".next" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
  echo ""
  echo "📝 Updating .gitignore..."
  cat >> "$PROJECT_ROOT/.gitignore" << 'EOF'

# Build & Cache
.next
dist
*.tsbuildinfo

# Environment
.env.local
.env.*.local

# IDE
.vscode/settings.json
.idea

# OS
.DS_Store
Thumbs.db

# Logs
*.log
EOF
  echo "  ↪️  .gitignore updated"
fi

# Summary
echo ""
echo "✅ Tree-shaking complete!"
echo "   📦 Archived components: $ARCHIVE_DIR/components_$DATETIME/"
echo "   📄 Archived docs: $ARCHIVE_DIR/docs_$DATETIME/"
echo "   🗑️  Total size freed: $(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)"
echo ""
echo "📊 Archive structure:"
ls -la "$ARCHIVE_DIR/" | tail -5
echo ""
echo "ℹ️  To restore files, move from archive/ back to their original locations"
echo "✨ Next step: Run 'npm run build' to verify no breaking changes"
