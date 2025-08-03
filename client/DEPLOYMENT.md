# Vercel Deployment Guide

## Environment Variables Required

You need to set the following environment variables in your Vercel project settings:

### Required Variables:
1. **REACT_APP_CLERK_PUBLISHABLE_KEY** - Your Clerk publishable key
2. **REACT_APP_API_URL** - Your backend API URL (e.g., https://your-backend.vercel.app)

### How to Set Environment Variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - Name: `REACT_APP_CLERK_PUBLISHABLE_KEY`
   - Value: Your Clerk publishable key
   - Environment: Production (and Preview if needed)

5. Repeat for `REACT_APP_API_URL`

### Build Configuration

The `vercel.json` file is already configured for Create React App deployment.

### Common Issues:

1. **Missing Environment Variables**: If you see errors about undefined environment variables, make sure all required variables are set in Vercel.

2. **Build Failures**: Check the build logs in Vercel dashboard for specific error messages.

3. **API Connection Issues**: Ensure your backend is deployed and accessible from your frontend domain.

### Testing Locally:

Create a `.env.local` file in the client directory with:
```
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
REACT_APP_API_URL=http://localhost:5000
``` 