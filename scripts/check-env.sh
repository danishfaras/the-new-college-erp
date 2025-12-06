#!/bin/bash

# Check if DATABASE_URL is set in .env.local
if [ -f ".env.local" ]; then
    if grep -q "^DATABASE_URL=" .env.local && ! grep -q "^#.*DATABASE_URL=" .env.local; then
        echo "✅ DATABASE_URL found in .env.local"
        exit 0
    fi
fi

# Check if DATABASE_URL is set in .env
if [ -f ".env" ]; then
    if grep -q "^DATABASE_URL=" .env && ! grep -q "^#.*DATABASE_URL=" .env; then
        echo "✅ DATABASE_URL found in .env"
        exit 0
    fi
fi

echo "❌ ERROR: DATABASE_URL not found or is commented out"
echo ""
echo "Please set DATABASE_URL in .env.local:"
echo "  DATABASE_URL=mongodb://localhost:27017/the_new_college"
echo "  OR"
echo "  DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/the_new_college?retryWrites=true&w=majority"
echo ""
exit 1
