#!/bin/bash

# Script to unify border-radius across components
# Standard: controls → rounded-md (8px), cards → rounded-lg (12px), KPI cards → rounded-xl (16px)

cd "$(dirname "$0")"

echo "🎨 Унификация border-radius..."

# Fix buttons and inputs: rounded-md (8px) for all controls
find src/components/ui -name "button.tsx" -o -name "input.tsx" -o -name "select.tsx" | while read file; do
  sed -i '' 's/rounded-lg/rounded-md/g' "$file"
  sed -i '' 's/rounded-xl/rounded-md/g' "$file"
done

# Fix cards: rounded-lg (12px) for standard cards
find src -name "*.tsx" -type f -exec sed -i '' \
  -e 's/\(className="[^"]*\)rounded-2xl\([^"]*border[^"]*\)/\1rounded-lg\2/g' \
  {} \;

# Count results
echo ""
echo "✅ Border-radius унифицирован!"
echo "📊 Статистика:"
echo "rounded-md usage: $(find src -name "*.tsx" -type f -exec grep -o "rounded-md" {} \; | wc -l)"
echo "rounded-lg usage: $(find src -name "*.tsx" -type f -exec grep -o "rounded-lg" {} \; | wc -l)"
echo "rounded-xl usage: $(find src -name "*.tsx" -type f -exec grep -o "rounded-xl" {} \; | wc -l)"
echo "rounded-2xl usage: $(find src -name "*.tsx" -type f -exec grep -o "rounded-2xl" {} \; | wc -l)"
