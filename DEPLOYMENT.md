# 🚀 Railway Deployment Guide

## Prerequisites
- GitHub account
- Railway account (free)
- Your code pushed to GitHub

## Step-by-Step Deployment

### 1. **Prepare Your Code**
```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. **Deploy to Railway**

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository**: `stock-management-system`
6. **Railway will automatically detect** your Node.js app

### 3. **Configure Environment**

In Railway dashboard:
1. **Click your project**
2. **Go to "Variables" tab**
3. **Add these environment variables**:
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret-key-2024
   PORT=3001
   ```

### 4. **Add Database (Optional but Recommended)**

1. **Click "New Service"**
2. **Select "PostgreSQL"**
3. **Railway will automatically set DATABASE_URL**

### 5. **Deploy Frontend**

For the React frontend:
1. **Create new Railway service**
2. **Set build command**: `npm run build`
3. **Set start command**: `npm run preview`
4. **Add environment variable**:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```

### 6. **Domain & Access**

- Railway provides free subdomain: `your-app.railway.app`
- Access your app at the provided URL
- Frontend and backend get separate URLs

## 🔧 **Alternative Free Options**

### **Option 2: Render**
1. Connect GitHub to Render
2. Create Web Service (Node.js)
3. Add PostgreSQL database
4. Set environment variables
5. Deploy

### **Option 3: Vercel + PlanetScale**
1. Deploy frontend to Vercel
2. Convert backend to API routes
3. Use PlanetScale for database
4. Set environment variables

## 📊 **Your System Resources**

Your stock management system should fit comfortably in free tiers:
- **RAM**: ~100-200MB
- **Storage**: ~50MB for database
- **Requests**: Normal business usage well within limits

## 🐛 **Troubleshooting**

### Common Issues:
1. **Build fails**: Check Node.js version compatibility
2. **Database connection**: Verify DATABASE_URL is set
3. **CORS errors**: Update frontend API URL
4. **Port issues**: Railway sets PORT automatically

### Logs:
- Check Railway logs in dashboard
- Use `console.log` for debugging
- Monitor resource usage

## 💡 **Pro Tips**

1. **Keep sample data** for demo purposes
2. **Regular backups** - export data periodically
3. **Monitor usage** to stay within free limits
4. **Use environment variables** for all secrets

Your system is now production-ready! 🎉
