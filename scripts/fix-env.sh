#!/bin/bash

# Fix environment setup for Prisma

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found. Run 'npm run setup:env' first."
    exit 1
fi

# Check if DATABASE_URL is set (uncommented) - get first uncommented line
UNCOMMENTED_DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | head -1)

if [ -z "$UNCOMMENTED_DB_URL" ]; then
    echo "⚠️  DATABASE_URL is not set or is commented out in $ENV_FILE"
    echo ""
    echo "Please uncomment and set DATABASE_URL in $ENV_FILE:"
    echo ""
    echo "For Local MongoDB:"
    echo "  DATABASE_URL=mongodb://localhost:27017/the_new_college"
    echo ""
    echo "For MongoDB Atlas:"
    echo "  DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/the_new_college?retryWrites=true&w=majority"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL is set in $ENV_FILE"
exit 0
