# Firebase → Supabase Conversion Quick Reference

## Common Conversions at a Glance

### 1. SELECT / GET Operations

#### Get All Documents
```typescript
// BEFORE - Firebase
import { collection, getDocs } from "firebase/firestore";
const snapshot = await getDocs(collection(db, "products"));
const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// AFTER - Supabase
const { data: products, error } = await db.from('products').select('*');
if (error) throw error;
```

#### Get Single Document by ID
```typescript
// BEFORE - Firebase
import { doc, getDoc } from "firebase/firestore";
const docRef = doc(db, "users", userId);
const docSnapshot = await getDoc(docRef);
const user = docSnapshot.exists() ? { id: docSnapshot.id, ...docSnapshot.data() } : null;

// AFTER - Supabase
const { data: user, error } = await db
  .from('users')
  .select('*')
  .eq('id', userId)
  .single(); // .single() throws if multiple rows or none found

if (error?.code === 'PGRST116') { // No rows found
  return null;
}
```

#### Query with WHERE Clause
```typescript
// BEFORE - Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
const q = query(collection(db, "products"), where("category", "==", "perfumes"));
const snapshot = await getDocs(q);
const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// AFTER - Supabase
const { data: products, error } = await db
  .from('products')
  .select('*')
  .eq('category', 'perfumes');
if (error) throw error;
```

#### Query with Multiple Filters
```typescript
// BEFORE - Firebase
const q = query(
  collection(db, "orders"),
  where("userId", "==", currentUser.id),
  where("status", "==", "completed"),
  where("total", ">", 100)
);
const snapshot = await getDocs(q);

// AFTER - Supabase
const { data: orders, error } = await db
  .from('orders')
  .select('*')
  .eq('user_id', currentUser.id)
  .eq('status', 'completed')
  .gt('total', 100); // gt = greater than, lt = less than, gte = >=, lte = <=
if (error) throw error;
```

### 2. INSERT / CREATE Operations

#### Create with Custom ID
```typescript
// BEFORE - Firebase
import { doc, setDoc } from "firebase/firestore";
await setDoc(doc(db, "users", userId), userData);

// AFTER - Supabase
const { error } = await db
  .from('users')
  .insert([{ id: userId, ...userData }]);
if (error) throw error;
```

#### Create with Auto-Generated ID
```typescript
// BEFORE - Firebase
import { collection, addDoc } from "firebase/firestore";
const docRef = await addDoc(collection(db, "products"), productData);
console.log(docRef.id); // Auto-generated ID

// AFTER - Supabase
const { data: insertedData, error } = await db
  .from('products')
  .insert([productData])
  .select(); // .select() returns the inserted row

if (error) throw error;
console.log(insertedData[0].id); // Get the auto-generated ID
```

#### Create Multiple Records
```typescript
// BEFORE - Firebase
await Promise.all([
  addDoc(collection(db, "items"), item1),
  addDoc(collection(db, "items"), item2)
]);

// AFTER - Supabase
const { error } = await db
  .from('items')
  .insert([item1, item2]); // Insert array of items at once
if (error) throw error;
```

### 3. UPDATE Operations

```typescript
// BEFORE - Firebase
import { doc, updateDoc } from "firebase/firestore";
await updateDoc(doc(db, "users", userId), { name: "New Name", age: 30 });

// AFTER - Supabase
const { error } = await db
  .from('users')
  .update({ name: "New Name", age: 30 })
  .eq('id', userId);
if (error) throw error;
```

### 4. DELETE Operations

```typescript
// BEFORE - Firebase
import { doc, deleteDoc } from "firebase/firestore";
await deleteDoc(doc(db, "products", productId));

// AFTER - Supabase
const { error } = await db
  .from('products')
  .delete()
  .eq('id', productId);
if (error) throw error;
```

### 5. SORTING & LIMITING

```typescript
// BEFORE - Firebase
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
const q = query(
  collection(db, "products"),
  orderBy("createdAt", "desc"),
  limit(10)
);
const snapshot = await getDocs(q);

// AFTER - Supabase
const { data: products, error } = await db
  .from('products')
  .select('*')
  .order('created_at', { ascending: false }) // ascending: false = DESC
  .limit(10);
if (error) throw error;
```

### 6. COMPLEX QUERIES

#### Multiple Conditions with AND
```typescript
// BEFORE - Firebase
const q = query(
  collection(db, "orders"),
  where("userId", "==", userId),
  where("status", "==", "pending"),
  where("total", ">", 50),
  orderBy("createdAt", "desc"),
  limit(5)
);

// AFTER - Supabase
const { data: orders, error } = await db
  .from('orders')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'pending')
  .gt('total', 50)
  .order('created_at', { ascending: false })
  .limit(5);
```

#### Condition with OR (Supabase)
```typescript
// BEFORE - Firebase (more complex)
// Firebase requires multiple queries and merging

// AFTER - Supabase
const { data: products, error } = await db
  .from('products')
  .select('*')
  .or('category.eq.perfumes,category.eq.decants'); // OR operator
```

---

## Comparison Chart

| Operation | Firebase | Supabase |
|-----------|----------|----------|
| **Import** | `import { getDocs, collection } from "firebase/firestore"` | Already imported as `db` from `/firebase` |
| **Get All** | `getDocs(collection(db, "table"))` | `db.from('table').select('*')` |
| **Get One** | `getDoc(doc(db, "table", id))` | `db.from('table').select('*').eq('id', id).single()` |
| **Filter** | `where("field", "==", value)` | `.eq('field', value)` |
| **Insert** | `setDoc() / addDoc()` | `.insert([])` |
| **Update** | `updateDoc()` | `.update()` |
| **Delete** | `deleteDoc()` | `.delete()` |
| **Sort** | `orderBy("field", "asc")` | `.order('field', { ascending: true })` |
| **Limit** | `limit(10)` | `.limit(10)` |
| **Error Check** | `try/catch` | Check `.error` property |

---

## Real-World Examples

### Example 1: Fetch User Profile
```typescript
// BEFORE
const userRef = doc(db, "users", userId);
const userSnapshot = await getDoc(userRef);
if (!userSnapshot.exists()) throw new Error("User not found");
const user = { id: userSnapshot.id, ...userSnapshot.data() };

// AFTER
const { data: user, error } = await db
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

if (error) throw error;
// user is already an object with id included
```

### Example 2: Get Latest 10 Products
```typescript
// BEFORE
const q = query(
  collection(db, "products"),
  orderBy("createdAt", "desc"),
  limit(10)
);
const snapshot = await getDocs(q);
const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// AFTER
const { data: products, error } = await db
  .from('products')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) throw error;
// products is already an array of objects
```

### Example 3: Add Product to Cart
```typescript
// BEFORE
const cartRef = collection(db, "cartItems");
await addDoc(cartRef, {
  userId: currentUser.uid,
  productId: product.id,
  quantity: 1,
  addedAt: serverTimestamp()
});

// AFTER
const { error } = await db
  .from('cart_items')
  .insert([{
    user_id: currentUser.id,
    product_id: product.id,
    quantity: 1,
    created_at: new Date().toISOString()
  }]);

if (error) throw error;
```

### Example 4: Update Product Stock
```typescript
// BEFORE
const productRef = doc(db, "products", productId);
await updateDoc(productRef, {
  stock: increment(-1), // Decrease by 1
  lastUpdated: serverTimestamp()
});

// AFTER (Option 1: Fetch and update)
const { data: product, error: fetchError } = await db
  .from('products')
  .select('stock')
  .eq('id', productId)
  .single();

if (fetchError) throw fetchError;

const { error: updateError } = await db
  .from('products')
  .update({
    stock: product.stock - 1,
    updated_at: new Date().toISOString()
  })
  .eq('id', productId);
```

### Example 5: Search Products
```typescript
// BEFORE (no native text search in Firestore)
const snapshot = await getDocs(collection(db, "products"));
const results = snapshot.docs.filter(doc => 
  doc.data().name.toLowerCase().includes(searchTerm.toLowerCase())
);

// AFTER (using ILIKE for case-insensitive search)
const { data: results, error } = await db
  .from('products')
  .select('*')
  .ilike('name', `%${searchTerm}%`); // ILIKE is case-insensitive

if (error) throw error;
```

---

## Important Notes

### 1. Column Names
- **Firestore**: camelCase (parentId, createdAt, firstName)
- **Supabase**: snake_case (parent_id, created_at, first_name)
- **Always check Supabase Table Editor for exact column names**

### 2. Timestamps
- **Firestore**: `serverTimestamp()` returns special Timestamp object
- **Supabase**: Use `new Date().toISOString()` or set column default to `now()`

### 3. User IDs
- **Firebase**: `auth.uid()` from currentUser
- **Supabase**: `auth.user()?.id` or from session

### 4. Return Values
- **Firestore**: Returns objects with `id` property separate
- **Supabase**: Returns array with `id` already included in each object

### 5. Error Handling
- **Firestore**: `try/catch` with specific error codes
- **Supabase**: Check `error` property, use specific error codes like 'PGRST116'

---

## Helpful Supabase Operators

| Operator | Example | Meaning |
|----------|---------|---------|
| `.eq()` | `.eq('status', 'active')` | Equal (=) |
| `.neq()` | `.neq('status', 'deleted')` | Not equal (!=) |
| `.gt()` | `.gt('price', 100)` | Greater than (>) |
| `.gte()` | `.gte('price', 100)` | Greater than or equal (>=) |
| `.lt()` | `.lt('price', 100)` | Less than (<) |
| `.lte()` | `.lte('price', 100)` | Less than or equal (<=) |
| `.like()` | `.like('name', '%john%')` | Case-sensitive substring match |
| `.ilike()` | `.ilike('name', '%john%')` | Case-insensitive substring match |
| `.in()` | `.in('status', ['pending', 'active'])` | IN array of values |
| `.is()` | `.is('deleted_at', null)` | IS NULL check |
| `.order()` | `.order('created_at', { ascending: false })` | Sort results |
| `.limit()` | `.limit(10)` | Limit number of results |
| `.range()` | `.range(0, 9)` | Get rows 0-9 (pagination) |

---

## Quick Copy-Paste Templates

### Template 1: Fetch Collection
```typescript
const { data, error } = await db.from('TABLE_NAME').select('*');
if (error) throw error;
```

### Template 2: Fetch Single Item
```typescript
const { data, error } = await db
  .from('TABLE_NAME')
  .select('*')
  .eq('id', ID_VALUE)
  .single();
if (error && error.code !== 'PGRST116') throw error;
```

### Template 3: Query with Filter
```typescript
const { data, error } = await db
  .from('TABLE_NAME')
  .select('*')
  .eq('FIELD_NAME', FIELD_VALUE);
if (error) throw error;
```

### Template 4: Insert
```typescript
const { error } = await db
  .from('TABLE_NAME')
  .insert([{ field1: value1, field2: value2 }]);
if (error) throw error;
```

### Template 5: Update
```typescript
const { error } = await db
  .from('TABLE_NAME')
  .update({ field1: newValue1 })
  .eq('id', ID_VALUE);
if (error) throw error;
```

### Template 6: Delete
```typescript
const { error } = await db
  .from('TABLE_NAME')
  .delete()
  .eq('id', ID_VALUE);
if (error) throw error;
```

---

Use this as your reference guide when converting remaining files! 🚀
