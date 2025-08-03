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

## Build Configuration

The `vercel.json` file is already configured for Create React App deployment.

## Common Issues and Solutions:

### 1. Missing Environment Variables
**Error**: `REACT_APP_CLERK_PUBLISHABLE_KEY is not defined`
**Solution**: Set the environment variables in Vercel dashboard as described above.

### 2. ESLint Configuration Issues
**Error**: `Definition for rule 'import/no-unresolved' was not found`
**Solution**: The `.eslintrc.js` file has been created to fix this issue.

### 3. Build Failures
**Error**: Build process fails during compilation
**Solutions**:
- Check that all environment variables are set
- Ensure all dependencies are properly installed
- Check the build logs in Vercel dashboard for specific error messages

### 4. API Connection Issues
**Error**: Frontend can't connect to backend
**Solution**: 
- Ensure your backend is deployed and accessible
- Set the correct `REACT_APP_API_URL` in Vercel environment variables
- Check CORS configuration on your backend

### 5. Clerk Authentication Issues
**Error**: Authentication not working
**Solution**:
- Verify your Clerk publishable key is correct
- Ensure the key is set for the correct environment (Production/Preview)
- Check Clerk dashboard for domain configuration

## Testing Locally:

Create a `.env.local` file in the client directory with:
```
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
REACT_APP_API_URL=http://localhost:5000
```

## Deployment Steps:

1. **Set Environment Variables** in Vercel dashboard
2. **Deploy Backend First** - Ensure your backend is deployed and accessible
3. **Deploy Frontend** - Push your code to trigger the deployment
4. **Verify Deployment** - Check that all features work correctly

## Troubleshooting:

- **Check Build Logs**: Go to Vercel dashboard → Deployments → Click on deployment → View build logs
- **Test Locally**: Run `npm run build` locally to catch issues before deployment
- **Environment Variables**: Double-check all environment variables are set correctly
- **API Health**: Ensure your backend API is responding correctly

## Support:

If you continue to have issues:
1. Check the Vercel build logs for specific error messages
2. Verify all environment variables are set correctly
3. Test the build locally with `npm run build`
4. Ensure your backend is deployed and accessible 