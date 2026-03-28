# Vercel Deployment Instructions

## 🚀 Lilypad Code Runner ko Vercel pe deploy karne ke liye:

### Step 1: Vercel CLI Install karein
```bash
npm install -g vercel
```

### Step 2: Login karein Vercel pe
```bash
vercel login
```

### Step 3: Project deploy karein
```bash
vercel
```

### Step 4: Configuration confirm karein
- Framework: **Other**
- Build Command: **Leave blank**
- Output Directory: **Leave blank**
- Install Command: **pip install -r requirements.txt**

### Step 5: Production deploy karein
```bash
vercel --prod
```

## 📁 File Structure (Vercel ke liye optimized):
```
leafy-code-runner-main/
├── api/
│   └── index.py          # Vercel serverless function
├── static/                # CSS, JS, images, audio files
├── templates/
│   └── index.html        # Main HTML file
├── vercel.json           # Vercel configuration
├── requirements.txt      # Python dependencies
└── DEPLOYMENT.md         # Yeh file
```

## 🔧 Important Notes:

1. **Static Files**: `static/` folder me sab files properly serve hongi
2. **API Routes**: `/run` endpoint serverless function ke through work karega
3. **Templates**: `templates/index.html` properly render hoga
4. **Dependencies**: Flask aur vercel-wsgi automatically install honge

## 🌐 Deployment ke baad:
- App automatically URL pe deploy ho jayega
- Example: `https://your-app.vercel.app`
- GitHub integration se auto deployment bhi set kar sakte hain

## 🛠️ Troubleshooting:

### Agar error aaye "Module not found":
```bash
vercel --force
```

### Agar static files load na ho:
- `vercel.json` me staticDirectories check karein
- File paths lowercase me hona chahiye

### Agar build fail ho:
- `requirements.txt` check karein
- Python version compatible honi chahiye (3.9+)

## 🎯 Success:
Deploy ke baad aapka Lilypad Code Runner live ho jayega aur users directly code run kar sakenge!
