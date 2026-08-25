# College File-Sharing Platform

## Description
A modern, dynamic academic file-sharing platform that allows students to:
- Access their academic spaces
- View files based on their department, division, and batch
- View subjects dynamically based on their curriculum
- Upload files securely
- Preview supported files
- Download files
- Search files across their authorized spaces

The platform also includes a robust **Admin System** for managing:
- Departments
- Semesters
- Divisions
- Batches
- Subjects
- Students (including active/inactive toggles)
- Files (including moderation and deletion)
- Allowed Registration Email Domains

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite, React Query
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens), bcrypt

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd college-file-sharing-platform
   ```

2. **Install dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. **Configure Environment Variables:**
   - Navigate to the `server` directory.
   - Copy the example configuration:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in the required variables (see below).

4. **Start the backend:**
   ```bash
   cd server
   npm start
   ```

5. **Start the frontend:**
   ```bash
   cd client
   npm run dev
   ```

## Environment Variables
The following environment variables are required in the `server/.env` file:
- `PORT`: Port for the backend server
- `MONGO_URI`: Connection string for your MongoDB database
- `JWT_SECRET`: Secure key for signing JWT tokens
- `ADMIN_NAME`: Full name of the initial system admin
- `ADMIN_EMAIL`: Email address of the initial system admin
- `ADMIN_PASSWORD`: Secure password for the initial system admin

## Admin Setup
The first admin must be created securely without hardcoding credentials into the source code.
After configuring your `.env` file with the `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` variables, run the secure setup script:

```bash
cd server
npm run seed:admin
```

This script will safely create the admin account in the database (or skip if they already exist). Never commit your real admin credentials.
