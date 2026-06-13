# Migración de Firebase a Supabase

## Información de Supabase

**URL del Proyecto:** https://vqkshcozrnqfbxreuczj.supabase.co
**ID del Proyecto:** vqkshcozrnqfbxreuczj
**Contraseña de BD:** 31678239sudshdsb

## Archivos Modificados

1. **src/supabase.ts** - Nuevo archivo de configuración de Supabase
2. **src/firebase.ts** - Actualizado para usar Supabase como backend
3. **package.json** - Reemplazado Firebase por @supabase/supabase-js
4. **.env.local** - Variables de entorno de Supabase

## Pasos para Completar la Migración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear tablas en Supabase

Accede a tu proyecto en Supabase (https://app.supabase.com) y crea las siguientes tablas:

#### Tabla: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  category TEXT,
  category_name TEXT,
  image TEXT,
  brand TEXT,
  discount INTEGER,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  total DECIMAL(10, 2),
  items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: cart_items
```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Configurar Autenticación en Supabase

1. Ir a Authentication > Users
2. Configurar proveedores de autenticación (Email/Password)
3. Ajustar configuración de seguridad según necesites

### 4. Configurar Storage (Opcional)

Para archivos de productos:
1. Ir a Storage > New bucket
2. Crear bucket "products"
3. Configurar permisos públicos

### 5. Variables de Entorno

Las variables ya están configuradas en `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 6. Actualizar contextos (AuthContext)

El archivo `src/contexts/AuthContext.tsx` necesita actualizarse para usar Supabase auth en lugar de Firebase.

```typescript
// Cambiar de:
import { auth } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

// A:
import { auth } from "@/firebase"
import { signInWithPassword } from "@supabase/supabase-js"
```

### 7. Actualizar servicios de BD

Todos los servicios que usan Firestore deben actualizarse:

**Antes (Firebase):**
```typescript
import { collection, getDocs } from "firebase/firestore"
const snapshot = await getDocs(collection(db, "products"))
```

**Después (Supabase):**
```typescript
const { data, error } = await db
  .from('products')
  .select('*')
```

## Datos de Conexión

**Connection String (Transaction Pooler):**
```
postgresql://postgres.vqkshcozrnqfbxreuczj:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

**Reemplazar `[YOUR-PASSWORD]` con:** `31678239sudshdsb`

## Notas Importantes

1. **Seguridad:** Nunca hagas commit del archivo `.env.local`. Usa variables de entorno en producción.
2. **RLS (Row Level Security):** Configura RLS en Supabase para proteger datos de usuarios.
3. **Migraciones:** Los datos existentes en Firebase deben ser exportados e importados a Supabase.

## Recursos Útiles

- [Documentación Supabase](https://supabase.com/docs)
- [Guía de Autenticación](https://supabase.com/docs/guides/auth)
- [Guía de Base de Datos](https://supabase.com/docs/guides/database)
- [Referencia de API JavaScript](https://supabase.com/docs/reference/javascript)
