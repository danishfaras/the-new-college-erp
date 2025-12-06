# Environment Variables Setup Guide

## Quick Setup

Run the automated setup script:
```bash
npm run setup:env
```

This will:
- Create `.env.local` from `.env.example`
- Generate a secure `NEXTAUTH_SECRET` automatically
- Provide next steps

## Manual Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and configure:**

### Required Variables

#### DATABASE_URL
Your MongoDB connection string.

**For MongoDB Atlas (Cloud):**
```env
DATABASE_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/the_new_college?retryWrites=true&w=majority
```

**For Local MongoDB:**
```env
DATABASE_URL=mongodb://localhost:27017/the_new_college
```

**Getting MongoDB Atlas connection string:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or `0.0.0.0/0` for development)
5. Click "Connect" → "Connect your application"
6. Copy the connection string and replace `<password>` with your password

#### NEXTAUTH_URL
The base URL of your application.

**Development:**
```env
NEXTAUTH_URL=http://localhost:3000
```

**Production:**
```env
NEXTAUTH_URL=https://yourdomain.com
```

#### NEXTAUTH_SECRET
A secret key for JWT encryption (minimum 32 characters).

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Optional Variables

#### Email Configuration (SMTP)
If not configured, emails will be logged to the console in development mode.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@thenewcollege.edu
```

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate an "App Password" in your Google Account settings
3. Use the app password as `SMTP_PASS`

**Other providers:**
- **SendGrid**: `smtp.sendgrid.net`, port `587`
- **Mailgun**: `smtp.mailgun.org`, port `587`
- **AWS SES**: Check AWS SES documentation

#### Payment Gateways (Future)
These are placeholders for future payment integration.

```env
STRIPE_SECRET=sk_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

## Verification

After setting up your `.env.local`:

1. **Verify Prisma can connect:**
   ```bash
   npm run prisma:generate
   ```

2. **Push schema to database:**
   ```bash
   npm run prisma:push
   ```

3. **Seed the database:**
   ```bash
   npm run seed
   ```

4. **Start the dev server:**
   ```bash
   npm run dev
   ```

## Troubleshooting

### "DATABASE_URL is not set"
- Make sure `.env.local` exists (not just `.env`)
- Check that `DATABASE_URL` is in the file
- Restart your terminal/IDE

### "Invalid connection string"
- Verify your MongoDB connection string format
- Check that username/password are URL-encoded
- For Atlas: Ensure IP is whitelisted

### "NEXTAUTH_SECRET is too short"
- Must be at least 32 characters
- Generate a new one using the commands above

### "Cannot connect to MongoDB"
- Check if MongoDB is running (if local)
- Verify network access (if Atlas)
- Check firewall settings
- Verify credentials

## Security Notes

⚠️ **Never commit `.env.local` to git!**

- `.env.local` is already in `.gitignore`
- Use `.env.example` as a template
- Use different secrets for development and production
- Rotate secrets regularly in production

## Environment File Priority

Next.js loads environment variables in this order (later files override earlier ones):
1. `.env`
2. `.env.local` (highest priority, not committed to git)
3. `.env.development` / `.env.production` (based on NODE_ENV)

For local development, use `.env.local`.
