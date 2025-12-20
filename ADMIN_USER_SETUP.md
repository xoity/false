# Admin User Creation - Production Fix

## The Problem

You're seeing "Invalid email or password" when trying to log into the admin panel on your production server because **the admin user doesn't exist yet**.

The `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file are just variables - they don't automatically create the user.

## The Solution

### On Your Digital Ocean Droplet

SSH into your server and run these commands:

```bash
# Navigate to your Medusa project directory
cd /path/to/your/medusa/project

# Create the admin user from your .env file
npm run create-admin
```

Or run directly:
```bash
npx medusa exec ./src/scripts/create-admin.ts
```

### What This Does

The script will:
1. Read `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env` file
2. Create a new admin user in the database
3. Set up authentication so you can log in

### Expected Output

```
✅ Admin user created successfully!
   Email: admin2@example.com
   Password: ************
   You can now log in to the admin panel at /app
   
   🔗 Admin URL: http://your-server-ip:9000/app
```

## After Creating the User

1. Go to `http://your-server-ip:9000/app/login`
2. Enter your email from `.env`: `admin2@example.com`
3. Enter your password from `.env`: `supersecret`
4. Click "Continue with Email"

You should now be logged in! 🎉

## For Security (IMPORTANT!)

**In production, you MUST change the default password!**

1. After first login, go to Settings → Profile
2. Change your password to something strong
3. Update your `.env` file with the new password
4. Never commit `.env` to git

## Troubleshooting

### "Admin user already exists"
If you see this message, the user was already created. Try logging in with the credentials in your `.env` file. If you forgot the password, you'll need to reset it through the database or use a password reset flow.

### "Could not connect to database"
Make sure your `DATABASE_URL` in `.env` is correct and the database is accessible.

### Script fails
Check that:
- Your `.env` file is in the project root
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set
- The password is at least 8 characters long
- The server can connect to the database

## Creating Additional Admin Users

To create more admin users, you can:

1. **Use the admin panel** (easiest):
   - Log in as an admin
   - Go to Settings → Users
   - Click "Invite User"

2. **Modify and run the script**:
   - Edit `.env` with different email/password
   - Run `npm run create-admin`
   - Restore original admin credentials

3. **Use the Medusa Admin API**:
   ```bash
   curl -X POST http://your-server:9000/admin/users \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "email": "newadmin@example.com",
       "password": "strongpassword"
     }'
   ```

## Production Deployment Checklist

- [ ] Build completed (`npm run build`)
- [ ] Database migrated
- [ ] `.env` file configured with production values
- [ ] **Admin user created** (`npm run create-admin`)
- [ ] Seed data loaded if needed (`npm run seed`)
- [ ] Server started (`npm start`)
- [ ] Admin panel accessible at `/app`
- [ ] Default passwords changed
- [ ] Environment secrets secured

---

**Need help?** Check the full deployment guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
