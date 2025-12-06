# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables
```bash
npm run setup:env
```

This automatically:
- Creates `.env.local` from `.env.example`
- Generates a secure `NEXTAUTH_SECRET`

### Step 3: Configure MongoDB Connection

Edit `.env.local` and set your `DATABASE_URL`:

**For MongoDB Atlas (Cloud):**
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/the_new_college?retryWrites=true&w=majority
```

**For Local MongoDB:**
```env
DATABASE_URL=mongodb://localhost:27017/the_new_college
```

### Step 4: Initialize Database
```bash
npm run prisma:generate
npm run prisma:push
npm run seed
```

### Step 5: Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 🔑 Test Credentials

After seeding:
- **Admin**: `admin1@college.edu` / `password123`
- **Staff**: `staff1@college.edu` / `password123`
- **Student**: `student1@college.edu` / `password123`

## ⚠️ Common Issues

### "DATABASE_URL is not set"
- Make sure you created `.env.local` (not just `.env`)
- Run `npm run setup:env` to create it automatically

### "Cannot connect to MongoDB"
- Check your connection string format
- For Atlas: Verify IP whitelist and credentials
- For local: Ensure MongoDB is running

### "NEXTAUTH_SECRET is too short"
- The setup script generates this automatically
- Or generate manually: `openssl rand -base64 32`

## 📚 More Help

- [Full Setup Guide](./SETUP_GUIDE.md)
- [Environment Variables Guide](./ENV_SETUP.md)
- [README](./README.md)
