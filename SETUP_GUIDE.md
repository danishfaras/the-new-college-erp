# Setup Guide - NextGen Edu.ERP

## Quick Start (Copy-Paste Ready)

```bash
# 1. Clone the repository
git clone <repo-url>
cd nextgen-edu-erp

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Option 1: Use the setup script (recommended - auto-generates NEXTAUTH_SECRET)
npm run setup:env

# Option 2: Manual setup
cp .env.example .env.local
# Edit .env.local and add your DATABASE_URL (MongoDB connection string)
# Generate NEXTAUTH_SECRET: openssl rand -base64 32

# 4. Generate Prisma Client
npm run prisma:generate

# 5. Push database schema
npm run prisma:push

# 6. Seed the database with sample data
npm run seed

# 7. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with the following:

```env
# Required
DATABASE_URL=mongodb+srv://<user>:<pw>@cluster0.mongodb.net/the_new_college?retryWrites=true&w=majority
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-min-32-characters

# Optional (for email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@nextgenedu.edu
```

### Getting MongoDB Connection String

**Option 1: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or 0.0.0.0/0 for development)
5. Get connection string from "Connect" → "Connect your application"

**Option 2: Local MongoDB**
1. Install MongoDB locally
2. Start MongoDB service
3. Use: `mongodb://localhost:27017/the_new_college`

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Test Credentials

After running the seed script, use these credentials:

- **Admin**: `admin1@college.edu` / `password123`
- **Staff**: `staff1@college.edu` / `password123`
- **Student**: `student1@college.edu` / `password123`

## Docker Setup

```bash
# Build and run
docker-compose up -d

# Run migrations and seed
docker-compose exec app npm run prisma:push
docker-compose exec app npm run seed

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

## Troubleshooting

### "Prisma Client not generated"
```bash
npm run prisma:generate
```

### "Database connection failed"
- Check your `DATABASE_URL` is correct
- Ensure MongoDB is accessible
- For Atlas: Check IP whitelist and credentials

### "NextAuth errors"
- Ensure `NEXTAUTH_SECRET` is set (min 32 characters)
- Check `NEXTAUTH_URL` matches your app URL

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. ✅ Complete setup
2. ✅ Login with test credentials
3. ✅ Explore admin dashboard
4. ✅ Test user approval flow
5. ✅ Explore student/staff dashboards

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests
npm run prisma:studio # Open Prisma Studio (database GUI)
```

## Project Structure

- `/app` - Next.js pages and API routes
- `/components` - React components
- `/lib` - Utility functions and configurations
- `/prisma` - Database schema and migrations
- `/types` - TypeScript type definitions
- `/e2e` - End-to-end tests
- `/__tests__` - Unit tests

---

For more details, see [README.md](./README.md)
