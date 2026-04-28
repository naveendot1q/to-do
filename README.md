# ✦ My Todo — Personal Workspace

## 🚀 Deploy to Vercel (3 steps)

### Step 1 — Run Supabase Migration
Open `SUPABASE_MIGRATION.sql` and run it in Supabase → SQL Editor

### Step 2 — Push to GitHub
```bash
# IMPORTANT: Delete ALL old files first, then copy these
cd your-repo
find . -not -path './.git/*' -not -name '.git' -delete
cp -r /path/to/final-todo/. .
git add -A
git commit -m "final: clean Next.js todo app"
git push
```

### Step 3 — Vercel Environment Variables
In Vercel → Project Settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

Vercel will auto-deploy on push ✅

---

## ✅ Features
- 🔐 Email + Password + TOTP 2FA (Microsoft Authenticator)
- ✦ Custom Tasks — add anytime
- 🔁 Daily Tasks — set once, apply to any day
- ⏰ Time Slots — set start/end time per task
- 🎨 Dynamic Background — changes based on task status
- 📅 Date Browser — weekly calendar view
- 📱 PWA — installable on phone
- 🔴🟡🟢 Priority sorting
