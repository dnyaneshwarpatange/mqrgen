# Deployment Checklist

## Before Deploying to Vercel

### ✅ Environment Variables
- [ ] `REACT_APP_CLERK_PUBLISHABLE_KEY` is set in Vercel
- [ ] `REACT_APP_API_URL` is set in Vercel
- [ ] Environment variables are set for Production environment
- [ ] Environment variables are set for Preview environment (if needed)

### ✅ Backend Deployment
- [ ] Backend is deployed and accessible
- [ ] Backend URL is correct in `REACT_APP_API_URL`
- [ ] CORS is configured on backend to allow frontend domain

### ✅ Code Quality
- [ ] `npm run build` completes successfully locally
- [ ] No ESLint errors
- [ ] All imports are resolved
- [ ] No console errors in browser

### ✅ Clerk Configuration
- [ ] Clerk publishable key is correct
- [ ] Clerk dashboard has the correct domain configured
- [ ] Authentication flow works locally

### ✅ Dependencies
- [ ] All dependencies are in package.json
- [ ] No missing peer dependencies
- [ ] All imports are properly resolved

## Deployment Steps

1. **Set Environment Variables** in Vercel dashboard
2. **Deploy Backend** first (if not already deployed)
3. **Push Code** to trigger frontend deployment
4. **Monitor Build** logs in Vercel dashboard
5. **Test Deployment** after successful build

## Common Issues to Check

- [ ] Environment variables are properly set
- [ ] Backend is accessible from frontend domain
- [ ] No build errors in Vercel logs
- [ ] Authentication works on deployed site
- [ ] API calls work correctly

## Post-Deployment Verification

- [ ] Site loads without errors
- [ ] Authentication works
- [ ] QR code generation works
- [ ] All features function correctly
- [ ] No console errors in browser 