# 🚀 OpenRouter Plugin Testing Guide

This guide shows you how to test and build your OpenRouter plugin the same way as the default BrainDrive plugins.

## ✅ **Build Status: SUCCESSFUL**

Your OpenRouter plugin has been successfully built! The build created:

- ✅ `dist/remoteEntry.js` (142KB) - Module Federation entry point
- ✅ `dist/index.html` (3.2KB) - Plugin HTML template
- ✅ All TypeScript definitions and source maps
- ✅ Component and utility files

## 🧪 **Testing Methods**

### **Method 1: Development Testing (Recommended)**

#### **Step 1: Start BrainDrive Backend**

```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --host localhost --port 8005
```

#### **Step 2: Start BrainDrive Frontend**

```bash
# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### **Step 3: Access BrainDrive**

- Open: http://localhost:5173
- Login to your BrainDrive account

#### **Step 4: Install Plugin via Plugin Manager**

1. Navigate to **Plugin Manager** in BrainDrive
2. Click **"Install Plugin"**
3. Choose **"Local File Upload"** method
4. Create a ZIP file of your plugin:
   ```bash
   # From the BrainDrive root directory
   cd plugins/BrainDriveOpenRouter
   # Create ZIP (Windows)
   powershell Compress-Archive -Path * -DestinationPath ../BrainDriveOpenRouter.zip
   # Or use any ZIP tool to create: BrainDriveOpenRouter.zip
   ```
5. Upload the ZIP file through the Plugin Manager
6. Click **"Install"**

#### **Step 5: Test the Plugin**

1. Go to **Settings** page in BrainDrive
2. Look for **"OpenRouter API Keys"** section
3. Test the functionality:
   - Enter an OpenRouter API key
   - Test validation
   - Test save/remove functionality
   - Test theme switching

### **Method 2: Direct Backend Integration**

#### **Step 1: Copy Plugin to Backend**

```bash
# Copy the built plugin to backend plugins directory
cp -r plugins/BrainDriveOpenRouter backend/app/plugins/
```

#### **Step 2: Restart Backend**

```bash
# Restart the backend server
# The plugin should be automatically detected
```

#### **Step 3: Test via API**

```bash
# Test plugin installation
curl -X POST "http://localhost:8005/api/v1/plugins/install" \
  -H "Content-Type: application/json" \
  -d '{
    "plugin_slug": "BrainDriveOpenRouter",
    "version": "1.0.0",
    "source_url": "local"
  }'
```

### **Method 3: Development Mode with Hot Reload**

#### **Step 1: Start Development Server**

```bash
cd plugins/BrainDriveOpenRouter
npm run dev
```

#### **Step 2: Access Development Server**

- Open: http://localhost:9007
- This shows your plugin in isolation

#### **Step 3: Make Changes and Test**

- Edit `src/ComponentOpenRouterKeys.tsx`
- Changes will automatically reload
- Test functionality in isolation

## 🔧 **Build Commands**

### **Quick Build**

```bash
cd plugins/BrainDriveOpenRouter
npm run build
```

### **Development Build with Watch**

```bash
cd plugins/BrainDriveOpenRouter
npm run dev
```

### **Clean and Rebuild**

```bash
cd plugins/BrainDriveOpenRouter
npm run clean
npm run build
```

## 📋 **Testing Checklist**

### **✅ Build Verification**

- [x] `npm run build` completes successfully
- [x] `dist/remoteEntry.js` is created (142KB)
- [x] `dist/index.html` is created (3.2KB)
- [x] No TypeScript errors
- [x] No webpack errors

### **✅ Plugin Installation**

- [ ] Plugin appears in Plugin Manager
- [ ] Installation completes successfully
- [ ] No backend errors during installation
- [ ] Plugin metadata is created in database

### **✅ Component Functionality**

- [ ] Component loads in Settings page
- [ ] API key input field works
- [ ] Validation works (sk-or- prefix)
- [ ] Save functionality works
- [ ] Remove functionality works
- [ ] Theme switching works (light/dark)
- [ ] Error handling works
- [ ] Loading states work

### **✅ API Integration**

- [ ] Settings API calls work
- [ ] User authentication works
- [ ] API key is encrypted and stored
- [ ] Masked key display works
- [ ] Last updated timestamp works

### **✅ UI/UX**

- [ ] Responsive design works
- [ ] Accessibility features work
- [ ] Error messages are clear
- [ ] Success messages appear
- [ ] Loading indicators work

## 🐛 **Troubleshooting**

### **Build Issues**

```bash
# If build fails, try:
npm install
npm run clean
npm run build
```

### **Plugin Not Appearing**

1. Check backend logs for errors
2. Verify plugin is in `backend/app/plugins/`
3. Restart backend server
4. Check database for plugin records

### **Component Not Loading**

1. Check browser console for errors
2. Verify `remoteEntry.js` is accessible
3. Check webpack configuration
4. Verify Module Federation setup

### **API Issues**

1. Check network tab in browser dev tools
2. Verify API endpoints are correct
3. Check authentication headers
4. Verify backend API routes

## 🎯 **Next Steps**

### **For Development**

1. Test all functionality thoroughly
2. Fix any issues found
3. Add more features as needed
4. Improve error handling

### **For Distribution**

1. Create distribution package:
   ```bash
   cd plugins/BrainDriveOpenRouter
   # Create ZIP for distribution
   powershell Compress-Archive -Path * -DestinationPath ../BrainDriveOpenRouter-v1.0.0.zip
   ```
2. Test installation from ZIP
3. Document installation instructions
4. Share with users

### **For Production**

1. Deploy to GitHub repository
2. Create release with built files
3. Update plugin metadata
4. Test installation from GitHub URL

## 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Review backend logs
3. Check browser console for errors
4. Verify all dependencies are installed
5. Ensure BrainDrive is running correctly

---

**🎉 Congratulations!** Your OpenRouter plugin is now built and ready for testing!
