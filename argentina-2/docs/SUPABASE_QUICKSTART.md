# Supabase Migration - Quick Start Guide

## 🚀 What's Been Done

The application has been successfully migrated from Firebase to Supabase for:
- ✅ Authentication (Login/Register pages)
- ✅ Auth Context (AuthContext.tsx)
- ✅ Database utilities wrapper (database.ts)
- ✅ Category hooks (use-categories.tsx)
- ✅ Configuration files (.env.local, supabase.ts, firebase.ts)
- ✅ Dependencies (package.json updated with @supabase/supabase-js)

## 📋 What Needs to Happen Next

### Step 1: Create the Database Tables (CRITICAL - DO THIS FIRST)

1. Go to https://app.supabase.com and log in
2. Select your project "fuego-shop-express" (Project ID: vqkshcozrnqfbxreuczj)
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy-paste all SQL table creation scripts from `SUPABASE_MIGRATION_STATUS.md`
6. Execute all queries to create the tables

**Tables to create:**
- `users` - User profiles and account information
- `products` - Product catalog
- `categories` - Product categories
- `orders` - Customer orders
- `cart_items` - Shopping cart items
- `testimonios` - Product reviews/comments
- `product_views` - Analytics for product views

### Step 2: Install Dependencies

Run this command in your terminal:
```bash
npm install
# or if using bun
bun install
```

This will install the Supabase JavaScript SDK: `@supabase/supabase-js ^2.39.0`

### Step 3: Test the Migration

#### Test Login/Register
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:5173/login`
3. Try creating a new account
4. Try logging in
5. Verify user data appears in Supabase dashboard → **Table Editor** → `users` table

#### Verify Supabase Connection
In your browser console, you should be able to run:
```javascript
// This will work if Supabase is properly connected
console.log("Supabase connected!")
```

### Step 4: Update Remaining Components

For each file that still has Firebase imports, follow the migration pattern guide:

**Conversion Examples:**

**File: ProductDetail.tsx**
- Current: `getDocs(collection(db, "products"))`
- Change to: `db.from('products').select('*')`
- Current: `getDoc(doc(db, "reviews", reviewId))`
- Change to: `db.from('reviews').select('*').eq('id', reviewId).single()`

**File: AdminPanel.tsx**
- All Firestore collection queries become Supabase `.from().select()`
- All document fetches become Supabase `.eq('id', docId).single()`
- All updates become `.update().eq()`
- All deletes become `.delete().eq()`

### Step 5: Run Full Tests

```bash
# Build the app to check for TypeScript errors
npm run build

# Run the dev server and test:
npm run dev
```

Test the following flows:
- [ ] Register new account
- [ ] Login with existing account
- [ ] View products
- [ ] Add to cart
- [ ] View user profile
- [ ] Admin panel operations (if admin user)

## 🔑 Environment Variables

Your `.env.local` file is already configured with:
```
VITE_SUPABASE_URL=https://vqkshcozrnqfbxreuczj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_m431429UTneqaTwUWFwvhQ_EpzC-nrB
VITE_SUPABASE_PASSWORD=31678239sudshdsb
```

⚠️ **Never commit this file to version control!** It's already in `.gitignore`.

## 📊 Migration Progress

| Component | Status | Notes |
|-----------|--------|-------|
| Configuration | ✅ Complete | supabase.ts, .env.local configured |
| Auth Pages | ✅ Complete | LoginPage.tsx, RegisterPage.tsx updated |
| AuthContext | ✅ Complete | All Supabase auth methods implemented |
| Database Utilities | ✅ Complete | database.ts fully migrated |
| Hooks | ✅ Complete | use-categories.tsx migrated |
| Dependencies | ✅ Complete | @supabase/supabase-js installed |
| Database Tables | ❌ NOT STARTED | Execute SQL in Supabase dashboard |
| AdminPanel.tsx | ❌ NOT STARTED | Still uses Firestore |
| ProductDetail.tsx | ❌ NOT STARTED | Still uses Firestore |
| Analytics | ❌ NOT STARTED | Still uses Firestore |
| Other Pages | ❌ NOT STARTED | Testimonios, Retiros, etc. |

## 🔗 Useful Links

- **Supabase Dashboard**: https://app.supabase.com
- **Project**: fuego-shop-express (vqkshcozrnqfbxreuczj)
- **SQL Editor**: https://app.supabase.com/project/vqkshcozrnqfbxreuczj/sql/new
- **Table Editor**: https://app.supabase.com/project/vqkshcozrnqfbxreuczj/editor
- **Documentation**: https://supabase.com/docs/guides/database

## ⚡ Quick Migration Checklist

- [ ] Execute SQL table creation scripts in Supabase
- [ ] Run `npm install` to install Supabase SDK
- [ ] Test login/register flows
- [ ] Update AdminPanel.tsx with Supabase queries
- [ ] Update ProductDetail.tsx with Supabase queries
- [ ] Update Testimonios.tsx with Supabase queries
- [ ] Update analytics files
- [ ] Test all product operations
- [ ] Deploy to production

## 🆘 Troubleshooting

### "Table does not exist" Error
**Solution**: You haven't created the tables yet. Execute the SQL scripts in Supabase SQL Editor.

### "No matching RLS policy" Error
**Solution**: RLS (Row Level Security) policies might be too restrictive. Either:
1. Disable RLS for development (not recommended for production)
2. Create appropriate RLS policies in Supabase
3. Use a service role key instead of anon key (advanced)

### "Column not found" Error
**Solution**: Column names in Supabase use snake_case (e.g., `parent_id` not `parentId`). Check table schema in Supabase Table Editor.

### TypeScript Compilation Errors
**Solution**: When you update imports from `firebase/firestore` to just using `db`, ensure you've updated all function calls to match Supabase syntax.

## 📚 Migration Pattern Reference

See `SUPABASE_MIGRATION_STATUS.md` for detailed patterns showing:
- How to convert each Firebase operation to Supabase
- Examples for all common CRUD operations
- SQL schema definitions
- RLS policy examples

## 🎯 Success Criteria

You'll know the migration is successful when:
1. ✅ Users can register and login
2. ✅ User data is saved in Supabase `users` table
3. ✅ Products load from Supabase `products` table
4. ✅ Categories load from Supabase `categories` table
5. ✅ Admin operations work (if you have AdminPanel updated)
6. ✅ No Firebase imports remain in active code
7. ✅ Application builds without errors
8. ✅ All tests pass

---

**Questions?** Refer to:
- `SUPABASE_MIGRATION_STATUS.md` - Detailed migration guide
- `MIGRACION_SUPABASE.md` - Original migration documentation
- Supabase Docs: https://supabase.com/docs
