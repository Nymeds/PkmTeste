#!/bin/bash

echo "🔍 Verifying Pokemon Desktop Pet Implementation"
echo "=============================================="
echo ""

# Check if main files exist
echo "📁 Checking core files..."
files=(
    "src/main.js"
    "src/pet.js"
    "src/index.html"
    "package.json"
    "prisma/schema.prisma"
)

for file in "${files[@]}"; do
    if [ -f "/app/$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING"
    fi
done

echo ""
echo "📁 Checking documentation..."
docs=(
    "GIF_INSTRUCTIONS.md"
    "CHANGELOG.md"
    "QUICK_START.md"
    "IMPLEMENTATION_SUMMARY.md"
    "test_gif_loading.js"
)

for doc in "${docs[@]}"; do
    if [ -f "/app/$doc" ]; then
        echo "✅ $doc"
    else
        echo "❌ $doc - MISSING"
    fi
done

echo ""
echo "🎬 Checking GIF priority implementation..."

# Check if GIF is prioritized in main.js
if grep -q '${name}.gif' /app/src/main.js; then
    echo "✅ main.js - GIF priority implemented"
else
    echo "❌ main.js - GIF priority NOT found"
fi

# Check if GIF is prioritized in pet.js
if grep -q '${name}.gif' /app/src/pet.js; then
    echo "✅ pet.js - GIF priority implemented"
else
    echo "❌ pet.js - GIF priority NOT found"
fi

echo ""
echo "🎮 Checking animation enhancements..."

# Check for new animation properties
if grep -q 'this.acceleration' /app/src/pet.js; then
    echo "✅ Acceleration system implemented"
else
    echo "❌ Acceleration system NOT found"
fi

if grep -q 'this.stretch' /app/src/pet.js; then
    echo "✅ Stretch animation implemented"
else
    echo "❌ Stretch animation NOT found"
fi

if grep -q 'turnProgress' /app/src/pet.js; then
    echo "✅ Turn animation implemented"
else
    echo "❌ Turn animation NOT found"
fi

echo ""
echo "📦 Checking dependencies..."
if [ -d "/app/node_modules" ]; then
    echo "✅ node_modules installed"
else
    echo "⚠️  node_modules not found - run 'npm install'"
fi

if [ -d "/app/node_modules/@prisma/client" ]; then
    echo "✅ Prisma client generated"
else
    echo "⚠️  Prisma client not found - run 'npx prisma generate'"
fi

echo ""
echo "🎨 Checking Pokemon GIF files..."
for pokemon in bulbasaur charmander squirtle pikachu dragonite; do
    if [ -f "/app/pokedex/$pokemon/$pokemon.gif" ]; then
        echo "✅ $pokemon - Has GIF sprite"
    else
        echo "⚪ $pokemon - No GIF (using PNG fallback)"
    fi
done

echo ""
echo "🧪 Running syntax checks..."
node -c /app/src/main.js 2>&1 && echo "✅ main.js syntax valid" || echo "❌ main.js has syntax errors"
node -c /app/src/pet.js 2>&1 && echo "✅ pet.js syntax valid" || echo "❌ pet.js has syntax errors"

echo ""
echo "=============================================="
echo "✅ Verification Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Add your GIF files to /app/pokedex/[pokemon]/"
echo "   2. Run: npm start"
echo "   3. Watch your animated Pokemon!"
echo ""
echo "📖 Documentation:"
echo "   - Quick Start: QUICK_START.md"
echo "   - GIF Guide: GIF_INSTRUCTIONS.md"
echo "   - Technical: IMPLEMENTATION_SUMMARY.md"
