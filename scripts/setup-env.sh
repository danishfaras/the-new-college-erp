#!/bin/bash

# Setup script for The New College ERP
# This script helps set up environment variables

echo "🚀 Setting up environment variables for The New College ERP"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Copy example file
if [ ! -f ".env.example" ]; then
    echo "❌ .env.example not found!"
    exit 1
fi

cp .env.example .env.local
echo "✅ Created .env.local from .env.example"
echo ""

# Generate NEXTAUTH_SECRET if not provided
if ! grep -q "NEXTAUTH_SECRET=your-secret-key" .env.local; then
    echo "✅ NEXTAUTH_SECRET already set"
else
    # Generate a random secret
    SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|NEXTAUTH_SECRET=your-secret-key-minimum-32-characters-long-change-in-production|NEXTAUTH_SECRET=$SECRET|g" .env.local
    else
        # Linux
        sed -i "s|NEXTAUTH_SECRET=your-secret-key-minimum-32-characters-long-change-in-production|NEXTAUTH_SECRET=$SECRET|g" .env.local
    fi
    echo "✅ Generated NEXTAUTH_SECRET"
fi

# Uncomment DATABASE_URL if it's commented (use local MongoDB by default)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/^# DATABASE_URL=mongodb:\/\/localhost/DATABASE_URL=mongodb:\/\/localhost/g' .env.local
    sed -i '' 's/^# DATABASE_URL=mongodb+srv/DATABASE_URL=mongodb+srv/g' .env.local 2>/dev/null || true
else
    # Linux
    sed -i 's/^# DATABASE_URL=mongodb:\/\/localhost/DATABASE_URL=mongodb:\/\/localhost/g' .env.local
    sed -i 's/^# DATABASE_URL=mongodb+srv/DATABASE_URL=mongodb+srv/g' .env.local 2>/dev/null || true
fi

echo ""
echo "✅ Uncommented DATABASE_URL (using local MongoDB by default)"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local if you want to use MongoDB Atlas instead of local MongoDB"
echo "2. Optionally configure SMTP settings for email"
echo "3. Run: npm run prisma:generate"
echo "4. Run: npm run prisma:push"
echo "5. Run: npm run seed"
echo ""
echo "💡 Example DATABASE_URL formats:"
echo "   - Local MongoDB (default): mongodb://localhost:27017/the_new_college"
echo "   - MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/the_new_college?retryWrites=true&w=majority"
echo ""
