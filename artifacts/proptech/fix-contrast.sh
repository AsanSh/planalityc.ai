#!/bin/bash

# Script to fix WCAG contrast issues
# Replace low-contrast colors with accessible alternatives

cd "$(dirname "$0")"

echo "🎨 Fixing WCAG contrast issues..."

# Fix text-gray-400 → text-gray-600 (for body text and interactive elements)
find src -name "*.tsx" -type f -exec sed -i '' \
  -e 's/text-gray-400/text-gray-600/g' \
  {} \;

# Fix text-emerald-500 → text-emerald-700
find src -name "*.tsx" -type f -exec sed -i '' \
  -e 's/text-emerald-500/text-emerald-700/g' \
  {} \;

# Fix text-purple-500 → text-purple-700
find src -name "*.tsx" -type f -exec sed -i '' \
  -e 's/text-purple-500/text-purple-700/g' \
  {} \;

# Fix text-violet-500 → text-violet-700
find src -name "*.tsx" -type f -exec sed -i '' \
  -e 's/text-violet-500/text-violet-700/g' \
  {} \;

# Fix bg-emerald-500 → bg-emerald-600 (for better visibility)
find src -name "*.tsx" -type f -exec sed -i '' \
  -e 's/bg-emerald-500/bg-emerald-600/g' \
  {} \;

echo "✅ Contrast fixes applied!"
echo "📊 Checking results..."

# Count fixes
echo ""
echo "text-gray-600 usage: $(find src -name "*.tsx" -type f -exec grep -o "text-gray-600" {} \; | wc -l)"
echo "text-emerald-700 usage: $(find src -name "*.tsx" -type f -exec grep -o "text-emerald-700" {} \; | wc -l)"
echo "text-purple-700 usage: $(find src -name "*.tsx" -type f -exec grep -o "text-purple-700" {} \; | wc -l)"
