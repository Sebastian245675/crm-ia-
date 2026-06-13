# Supabase Migration Status - Complete Guide

## ✅ COMPLETED MIGRATIONS

### 1. Configuration Files
- **src/supabase.ts** - Supabase client initialization with environment variables
- **src/firebase.ts** - Updated as Supabase adapter layer for backward compatibility
- **.env.local** - Environment variables configured with Supabase credentials
  - VITE_SUPABASE_URL: https://vqkshcozrnqfbxreuczj.supabase.co
  - VITE_SUPABASE_ANON_KEY: sb_publishable_m431429UTneqaTwUWFwvhQ_EpzC-nrB
  - VITE_SUPABASE_PASSWORD: 31678239sudshdsb

### 2. Authentication Pages & Context
- **src/pages/LoginPage.tsx** ✅
  - Replaced `signInWithEmailAndPassword` → `auth.signInWithPassword()`
  - Replaced `sendPasswordResetEmail` → `auth.resetPasswordForEmail()`

- **src/pages/RegisterPage.tsx** ✅
  - Replaced `createUserWithEmailAndPassword` → `auth.signUp()`
  - Replaced Firestore `setDoc` → Supabase `insert()` into users table
  - Updated to use Supabase users table schema

- **src/contexts/AuthContext.tsx** ✅
  - Replaced Firebase `onAuthStateChanged` → Supabase `auth.onAuthStateChange()`
  - Updated login method to use `auth.signInWithPassword()`
  - Updated register method to use `auth.signUp()` and `db.insert()`
  - Updated logout method to use `auth.signOut()`
  - Updated user data fetching to query Supabase `users` table

### 3. Database Utilities
- **src/lib/database.ts** ✅
  - `getCollection()` - Replaced `getDocs(collection())` → `db.from().select()`
  - `getDocumentById()` - Replaced `getDoc(doc())` → `db.from().select().eq().single()`
  - `queryCollection()` - Replaced `query().where()` → `db.from().select().eq()`
  - `createDocumentWithId()` - Replaced `setDoc()` → `db.insert()`
  - `createDocument()` - Replaced `addDoc()` → `db.insert().select()`
  - `updateDocument()` - Replaced `updateDoc()` → `db.update().eq()`
  - `deleteDocument()` - Replaced `deleteDoc()` → `db.delete().eq()`

### 4. Custom Hooks
- **src/hooks/use-categories.tsx** ✅
  - Replaced `getDocs(collection())` → `db.from('categories').select()`
  - Updated field mapping: `parentId` → `parent_id`, `parentName` → `parent_name`

### 5. Dependencies
- **package.json** ✅
  - Removed: firebase (^11.10.0), firebase-admin (^13.4.0)
  - Added: @supabase/supabase-js (^2.39.0)

## 📋 PARTIALLY COMPLETED / PENDING MIGRATIONS

### Files Still Using Firestore (Need Updates)

#### Priority 1: Core Pages
- **src/pages/AdminPanel.tsx**
  - Lines 50+: Uses `collection()`, `getDocs()`, `getDoc()`, `query()`, `where()`, `limit()`, `orderBy()`, `Timestamp`
  - Needs: Full conversion to Supabase queries
  
- **src/pages/ProductDetail.tsx**
  - Lines 2-3: Uses `doc()`, `getDoc()`, `collection()`, `query()`, `where()`, `getDocs()`, `limit()`, `orderBy()`
  - Needs: Product and review queries converted to Supabase

- **src/pages/Testimonios.tsx**
  - Uses: `collection()`, `getDoc()`, `doc()`, `getDocs()`, `addDoc()`, `query()`, `where()`, `serverTimestamp()`, `updateDoc()`, `deleteDoc()`
  - Needs: Comment/testimonial operations converted

#### Priority 2: Additional Pages
- **src/pages/SharedEmployeeManager.tsx**
  - Uses Firestore queries for employee data
  
- **src/pages/Retiros.tsx**
  - Uses `getDoc()`, `doc()` for pickup/withdrawal data
  
- **src/pages/Envios.tsx**
  - Uses `collection()`, `getDoc()`, `doc()` for shipping data

- **src/pages/AboutUs.tsx**
  - Uses `doc()`, `getDoc()` for about page content

#### Priority 3: Admin Pages
- **src/pages/AdminPanelNew.tsx**
  - Full Firestore integration, needs conversion
  
- **src/pages/AuthPage.tsx** (Legacy)
  - Should use LoginPage/RegisterPage instead but still has Firebase imports
  - Uses: `signInWithEmailAndPassword()`, `createUserWithEmailAndPassword()`, `setDoc()`, `doc()`

#### Priority 4: Analytics & Utilities
- **src/lib/product-analytics.ts**
  - Uses: `doc()`, `updateDoc()`, `getDoc()`, `increment()`, `collection()`, `addDoc()`, `serverTimestamp()`, `query()`, `where()`, `orderBy()`, `getDocs()`, `limit()`, `setDoc()`, `Timestamp`
  - Needs: Complete analytics system rewrite for Supabase

- **src/lib/product-analytics-enhanced.ts**
  - Similar Firestore dependencies

## 🗄️ DATABASE SCHEMA SETUP REQUIRED

### Tables to Create (Execute in Supabase SQL Editor)

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  department_number TEXT,
  conjunto TEXT,
  sub_cuenta TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  image TEXT,
  category TEXT,
  subcategory TEXT,
  stock INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  parent_id TEXT,
  parent_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total DECIMAL(10, 2),
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id TEXT REFERENCES products(id),
  quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Testimonios table (for reviews/comments)
CREATE TABLE IF NOT EXISTS testimonios (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  user_id UUID REFERENCES users(id),
  content TEXT,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product views/analytics table
CREATE TABLE IF NOT EXISTS product_views (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  device_type TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
```

### RLS Policies to Create

```sql
-- Users can only view their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Orders visible to owner only
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Cart items visible to owner only
CREATE POLICY "Users can view own cart" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

-- Products are public for SELECT
CREATE POLICY "Products are public" ON products
  FOR SELECT USING (is_published = true);

-- Admin full access (optional - implement based on your needs)
-- You'll need a function to check if user is admin
```

## 🔄 MIGRATION PATTERN REFERENCE

### Pattern 1: Get All Documents
```typescript
// BEFORE (Firebase)
const querySnapshot = await getDocs(collection(db, "products"));
const docs = querySnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));

// AFTER (Supabase)
const { data, error } = await db
  .from('products')
  .select('*');
```

### Pattern 2: Get Single Document
```typescript
// BEFORE (Firebase)
const docRef = doc(db, "users", userId);
const docSnapshot = await getDoc(docRef);
const user = docSnapshot.exists() ? { id: docSnapshot.id, ...docSnapshot.data() } : null;

// AFTER (Supabase)
const { data, error } = await db
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

### Pattern 3: Query with Filter
```typescript
// BEFORE (Firebase)
const q = query(collection(db, "products"), where("category", "==", "perfumes"));
const snapshot = await getDocs(q);

// AFTER (Supabase)
const { data, error } = await db
  .from('products')
  .select('*')
  .eq('category', 'perfumes');
```

### Pattern 4: Query with Multiple Filters
```typescript
// BEFORE (Firebase)
const q = query(
  collection(db, "orders"),
  where("user_id", "==", userId),
  where("status", "==", "completed")
);
const snapshot = await getDocs(q);

// AFTER (Supabase)
const { data, error } = await db
  .from('orders')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'completed');
```

### Pattern 5: Create/Insert
```typescript
// BEFORE (Firebase)
await setDoc(doc(db, "users", userId), userData);

// AFTER (Supabase)
const { data, error } = await db
  .from('users')
  .insert([{ id: userId, ...userData }]);
```

### Pattern 6: Update
```typescript
// BEFORE (Firebase)
await updateDoc(doc(db, "users", userId), { name: "New Name" });

// AFTER (Supabase)
const { error } = await db
  .from('users')
  .update({ name: "New Name" })
  .eq('id', userId);
```

### Pattern 7: Delete
```typescript
// BEFORE (Firebase)
await deleteDoc(doc(db, "products", productId));

// AFTER (Supabase)
const { error } = await db
  .from('products')
  .delete()
  .eq('id', productId);
```

### Pattern 8: Sorting & Limiting
```typescript
// BEFORE (Firebase)
const q = query(
  collection(db, "products"),
  orderBy("created_at", "desc"),
  limit(10)
);
const snapshot = await getDocs(q);

// AFTER (Supabase)
const { data, error } = await db
  .from('products')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);
```

## 📝 NEXT STEPS

1. **Execute SQL Schemas** (CRITICAL - Must do first)
   - Go to Supabase Dashboard → SQL Editor
   - Run all CREATE TABLE statements
   - Run RLS policies

2. **Complete File Migrations** (By Priority)
   - Priority 1: AdminPanel.tsx, ProductDetail.tsx
   - Priority 2: Testimonios.tsx, SharedEmployeeManager.tsx
   - Priority 3: Other pages

3. **Testing**
   - Test authentication (login/register)
   - Test product queries
   - Test admin panel operations
   - Test cart operations

4. **Production Deployment**
   - Set environment variables in hosting platform
   - Verify database connections
   - Run end-to-end tests

## 🔑 Important Notes

- Always include error handling for all Supabase calls
- Column names in Supabase use snake_case (e.g., `parent_id` not `parentId`)
- Some Firestore features like `serverTimestamp()` require manual implementation in Supabase
- RLS policies must be carefully configured to maintain security
- The current `database.ts` wrapper maintains fallback to simulated DB for development

## 📚 Resources

- Supabase JavaScript Client: https://supabase.com/docs/reference/javascript
- Migration Guide: https://supabase.com/docs/guides/migrations/firebase
- SQL Examples: https://supabase.com/docs/guides/database
