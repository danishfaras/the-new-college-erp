# The New College — ERP

A production-ready college ERP system built with Next.js, TypeScript, Prisma, and MongoDB. This system provides role-based dashboards for students, staff, and administrators with features including class timetables, exam schedules, attendance tracking, fee management, and real-time notifications.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js v5 (beta) with JWT
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Real-time**: Socket.IO
- **Validation**: Zod
- **Testing**: Jest, Playwright
- **Deployment**: Docker, GitHub Actions

## 📋 Features

### Authentication & Authorization
- ✅ User signup with admin approval flow
- ✅ Role-based access control (Admin, Staff, Student, Accounts)
- ✅ JWT-based sessions
- ✅ Protected routes with middleware

### Student Features
- ✅ View class timetable
- ✅ View exam schedules
- ✅ View attendance records with percentage
- ✅ View and pay fees (payment gateway placeholder)

### Staff Features
- ✅ Manage assigned classes
- ✅ Edit class timetables
- ✅ Take attendance
- ✅ Send notifications to students

### Admin Features
- ✅ User management (approve students, create staff)
- ✅ Class and subject management
- ✅ Fee management
- ✅ Comprehensive audit logs
- ✅ View all system activities

### Real-time Updates
- ✅ Socket.IO integration for timetable updates
- ✅ Real-time attendance notifications
- ✅ Live notification system

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 20+ 
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd the-new-college-erp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   **Option 1: Use the setup script (recommended)**
   ```bash
   npm run setup:env
   ```
   This will create `.env.local` from `.env.example` and generate a secure `NEXTAUTH_SECRET`.
   
   **Option 2: Manual setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` and fill in:
   ```env
   # Required: MongoDB connection string
   DATABASE_URL=mongodb+srv://<user>:<pw>@cluster0.mongodb.net/the_new_college?retryWrites=true&w=majority
   # OR for local MongoDB:
   # DATABASE_URL=mongodb://localhost:27017/the_new_college
   
   # Required: NextAuth configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-minimum-32-characters-long
   
   # Optional: Email configuration (leave empty to log emails to console in dev)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-password
   SMTP_FROM=noreply@thenewcollege.edu
   ```
   
   **Important**: 
   - Generate a secure `NEXTAUTH_SECRET` using: `openssl rand -base64 32`
   - Make sure your `DATABASE_URL` points to MongoDB (not PostgreSQL)

4. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

5. **Push database schema**
   ```bash
   npm run prisma:push
   ```

6. **Seed the database**
   ```bash
   npm run seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Setup

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Run migrations and seed (inside container)**
   ```bash
   docker-compose exec app npm run prisma:push
   docker-compose exec app npm run seed
   ```

3. **Access the application**
   - App: http://localhost:3000
   - MongoDB: localhost:27017

### Test Credentials

After seeding, you can use these credentials:

- **Admin**: `admin1@college.edu` / `password123`
- **Staff**: `staff1@college.edu` / `password123`
- **Student**: `student1@college.edu` / `password123`

## 📁 Project Structure

```
the-new-college-erp/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── staff/             # Staff dashboard
│   ├── student/           # Student dashboard
│   └── ...
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # UI components
│   └── forms/            # Form components
├── lib/                   # Utility libraries
│   ├── auth/             # Authentication config
│   ├── db/               # Database client
│   ├── utils/            # Utility functions
│   └── validations/      # Zod schemas
├── prisma/               # Prisma schema and migrations
│   └── seed.ts          # Seed script
├── types/                # TypeScript type definitions
└── scripts/              # Utility scripts
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/signup` - Student signup (requires approval)
- `POST /api/auth/login` - User login (handled by NextAuth)
- `POST /api/auth/approve` - Approve student (admin only)

### User Management

- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `POST /api/users/create-staff` - Create staff account (admin only)

### Classes & Timetable

- `GET /api/classes` - List classes
- `POST /api/classes` - Create class (admin only)
- `GET /api/classes/:id` - Get class details
- `PUT /api/classes/:id` - Update class
- `GET /api/timetable/:classId` - Get timetable
- `PUT /api/timetable/:classId` - Update timetable (staff/admin)

### Exams

- `POST /api/exams` - Create exam (staff/admin)
- `GET /api/exams/:classId` - Get exams for class

### Attendance

- `POST /api/attendance/:classId` - Record attendance (staff)
- `GET /api/attendance/:classId` - Get attendance records

### Fees

- `GET /api/fees/student/:studentId` - Get student fees
- `POST /api/fees` - Create fee invoice (admin/accounts)
- `POST /api/fees/pay/:id` - Mark fee as paid (placeholder)

### Notifications

- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Send notification (staff/admin)
- `POST /api/notifications/:id/read` - Mark as read

### Audit Logs

- `GET /api/audit` - Get audit logs (admin only)

## 🚢 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker Deployment (VPS)

1. Build Docker image:
   ```bash
   docker build -t the-new-college-erp .
   ```

2. Run container:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e DATABASE_URL=... \
     -e NEXTAUTH_SECRET=... \
     --name erp-app \
     the-new-college-erp
   ```

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Input validation with Zod
- ✅ Audit logging for all changes
- ✅ CORS configuration
- ✅ Environment variable protection

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🐛 Troubleshooting

### Prisma Client not generated
```bash
npm run prisma:generate
```

### Database connection issues
- Check your `DATABASE_URL` in `.env.local`
- Ensure MongoDB is running (if local)
- Verify network access (if using Atlas)

### NextAuth errors
- Ensure `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your deployment URL

## 📞 Support

For issues and questions, please contact the development team.

---

Built with ❤️ for The New College
