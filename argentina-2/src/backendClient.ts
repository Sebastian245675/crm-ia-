// Unified API Client for local Python backend (gui_server.py) and PostgreSQL
// Replaces the Supabase client implementation.

const MOCK_CATEGORIES = [
  { id: 'tecnologia', name: 'Tecnología', slug: 'tecnologia', display_order: 1, parent_id: null },
  { id: 'moda', name: 'Moda y Calzado', slug: 'moda', display_order: 2, parent_id: null },
  { id: 'hogar', name: 'Hogar y Cocina', slug: 'hogar', display_order: 3, parent_id: null },
  { id: 'beauty', name: 'Salud y Belleza', slug: 'beauty', display_order: 4, parent_id: null },
  { id: 'deportes', name: 'Deportes y Fitness', slug: 'deportes', display_order: 5, parent_id: null },
];

const MOCK_FILTERS = [
  { id: 'filtro-marca', name: 'Marca', order: 1 },
  { id: 'filtro-talla', name: 'Talla / Tamaño', order: 2 },
  { id: 'filtro-color', name: 'Color', order: 3 },
];

const MOCK_FILTER_OPTIONS = [
  { id: 'opt-apple', name: 'Apple', parent_id: 'filtro-marca', order: 1 },
  { id: 'opt-samsung', name: 'Samsung', parent_id: 'filtro-marca', order: 2 },
  { id: 'opt-nike', name: 'Nike', parent_id: 'filtro-marca', order: 3 },
  { id: 'opt-adidas', name: 'Adidas', parent_id: 'filtro-marca', order: 4 },
  { id: 'opt-sm', name: 'Small (S)', parent_id: 'filtro-talla', order: 1 },
  { id: 'opt-md', name: 'Medium (M)', parent_id: 'filtro-talla', order: 2 },
  { id: 'opt-lg', name: 'Large (L)', parent_id: 'filtro-talla', order: 3 },
  { id: 'opt-xl', name: 'Extra Large (XL)', parent_id: 'filtro-talla', order: 4 },
  { id: 'opt-negro', name: 'Negro', parent_id: 'filtro-color', order: 1 },
  { id: 'opt-blanco', name: 'Blanco', parent_id: 'filtro-color', order: 2 },
  { id: 'opt-azul', name: 'Azul', parent_id: 'filtro-color', order: 3 },
  { id: 'opt-rojo', name: 'Rojo', parent_id: 'filtro-color', order: 4 },
];

const MOCK_COMPANY_PROFILE = {
  id: 'merco',
  friendly_name: 'merco',
  legal_name: 'merco SA',
  logo: '',
  postal_address: 'Av. Cabildo 1234',
  city: 'Buenos Aires',
  postal_code: 'C1426',
  state: 'CABA',
  country: 'Argentina'
};

// Local storage keys for cached metadata
const METADATA_KEY_PREFIX = 'merco_meta_';
const AUTH_SESSION_KEY = 'auth_user_session';
const AUTH_TOKEN_KEY = 'auth_access_token';
const AUTH_BACKDOOR_KEY = 'auth_backdoor_active';

function getStoredAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function buildAuthHeaders() {
  const token = getStoredAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

class MockQueryBuilder {
  private table: string;
  private queryType: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filters: Array<{ field: string; val: any; op?: 'eq' | 'gte' | 'lte' | 'lt' | 'gt' }> = [];
  private limitCount: number | null = null;
  private singleRow: boolean = false;
  private maybeSingleRow: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    // Preserve any active insert/update/delete/upsert operation when chaining .select() for Supabase-style queries.
    if (this.queryType !== 'insert' && this.queryType !== 'update' && this.queryType !== 'delete' && this.queryType !== 'upsert') {
      this.queryType = 'select';
    }
    return this;
  }

  insert(data: any) {
    this.queryType = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.queryType = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.queryType = 'delete';
    return this;
  }

  eq(field: string, val: any) {
    this.filters.push({ field, val, op: 'eq' });
    return this;
  }

  gte(field: string, val: any) {
    this.filters.push({ field, val, op: 'gte' });
    return this;
  }

  lte(field: string, val: any) {
    this.filters.push({ field, val, op: 'lte' });
    return this;
  }

  lt(field: string, val: any) {
    this.filters.push({ field, val, op: 'lt' });
    return this;
  }

  gt(field: string, val: any) {
    this.filters.push({ field, val, op: 'gt' });
    return this;
  }

  in(field: string, vals: any[]) {
    return this;
  }

  // Supabase-like upsert support for the mock
  upsert(data: any, options?: any) {
    this.queryType = 'upsert';
    this.payload = data;
    return this;
  }

  ilike(field: string, pattern: string) {
    return this;
  }

  order(field: string, options?: any) {
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleRow = true;
    return this;
  }

  // Handle promise chain directly (await db.from(...))
  async then(resolve: any, reject: any) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      resolve({ data: null, error: err });
    }
  }

  private applyFilters(items: any[]) {
    let filtered = items;
    for (const f of this.filters) {
      filtered = filtered.filter((item: any) => {
        let itemVal = item[f.field];
        if (itemVal === undefined) {
          // Fallback camelCase / snake_case check
          const camelField = f.field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          const snakeField = f.field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
          itemVal = item[camelField] !== undefined ? item[camelField] : item[snakeField];
        }

        if (itemVal === undefined) return false;

        const filterVal = f.val;

        // Handle dates comparison
        const isDateString = (val: any) => typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes(':'));
        if (isDateString(itemVal) && isDateString(filterVal)) {
          const itemTime = new Date(itemVal).getTime();
          const filterTime = new Date(filterVal).getTime();
          if (f.op === 'gte') return itemTime >= filterTime;
          if (f.op === 'lte') return itemTime <= filterTime;
          if (f.op === 'lt') return itemTime < filterTime;
          if (f.op === 'gt') return itemTime > filterTime;
          return itemTime === filterTime;
        }

        // Standard comparison
        if (f.op === 'gte') return itemVal >= filterVal;
        if (f.op === 'lte') return itemVal <= filterVal;
        if (f.op === 'lt') return itemVal < filterVal;
        if (f.op === 'gt') return itemVal > filterVal;
        return String(itemVal) === String(filterVal);
      });
    }
    return filtered;
  }

  private async execute() {
    console.log(`[BackendDB] Table: ${this.table}, Action: ${this.queryType}`, {
      filters: this.filters,
      payload: this.payload
    });

    try {
      if (this.table === 'products') {
        if (this.queryType === 'select') {
          // GET /api/productos
          const res = await fetch('/api/productos', {
            method: 'GET',
            headers: buildAuthHeaders(),
          });
          const json = await res.json();
          const pythonProducts = json.productos || [];

          // Map each postgres product and merge with locally cached metadata
          const mapped = pythonProducts.map((p: any) => {
            const idStr = String(p.id);
            // Try to find local cached metadata (images, description, etc.)
            let cachedMeta: any = {};
            try {
              const raw = localStorage.getItem(`${METADATA_KEY_PREFIX}${idStr}`) ||
                localStorage.getItem(`${METADATA_KEY_PREFIX}${p.name}`);
              if (raw) {
                cachedMeta = JSON.parse(raw);
              }
            } catch (e) {
              console.warn("Error reading local metadata cache:", e);
            }

            return {
              id: idStr,
              name: p.name || p.nombre || 'Sin nombre',
              description: cachedMeta.description || p.description || 'Producto premium seleccionado',
              price: Number(p.price || 0),
              original_price: Number(cachedMeta.original_price || p.price || 0),
              category: cachedMeta.category || 'tecnologia',
              category_id: cachedMeta.category_id || 'tecnologia',
              category_name: cachedMeta.category_name || 'Tecnología',
              subcategory: cachedMeta.subcategory || '',
              subcategory_name: cachedMeta.subcategory_name || '',
              tercera_categoria: cachedMeta.tercera_categoria || '',
              tercera_categoria_name: cachedMeta.tercera_categoria_name || '',
              stock: Number(p.stock || 0),
              is_published: p.activo !== false,
              is_offer: !!cachedMeta.is_offer || false,
              discount: Number(cachedMeta.discount || 0),
              specifications: cachedMeta.specifications || [],
              colors: cachedMeta.colors || [],
              benefits: cachedMeta.benefits || [],
              warranties: cachedMeta.warranties || [],
              payment_methods: cachedMeta.payment_methods || [],
              image: cachedMeta.image || p.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=60',
              additional_images: cachedMeta.additional_images || [],
              is_decant: !!cachedMeta.is_decant || false,
              decant_options: cachedMeta.decant_options || null,
              created_at: p.date || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });

          // Apply filters in memory if requested
          const filtered = this.applyFilters(mapped);

          if (this.singleRow || this.maybeSingleRow) {
            return { data: filtered[0] || null, error: null };
          }
          return { data: filtered, error: null };

        } else if (this.queryType === 'insert') {
          const prodData = Array.isArray(this.payload) ? this.payload[0] : this.payload;

          // 1. Save main fields to Python Backend database (PostgreSQL)
          const payloadToSend = {
            nombre: prodData.name || prodData.nombre,
            precio: Number(prodData.price),
            stock: Number(prodData.stock)
          };

          const res = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadToSend)
          });
          const json = await res.json();

          if (!json.success) {
            throw new Error(json.message || "Failed to create product in Python backend");
          }

          // Fetch products to find the newly generated ID
          const verifyRes = await fetch('/api/productos', {
            method: 'GET',
            headers: buildAuthHeaders(),
          });
          const verifyJson = await verifyRes.json();
          const latestProduct = (verifyJson.productos || [])
            .filter((p: any) => (p.name || p.nombre) === payloadToSend.nombre)
            .sort((a: any, b: any) => b.id - a.id)[0];

          const newId = latestProduct ? String(latestProduct.id) : `temp-${Date.now()}`;

          // 2. Cache rich metadata locally
          try {
            localStorage.setItem(`${METADATA_KEY_PREFIX}${newId}`, JSON.stringify(prodData));
            localStorage.setItem(`${METADATA_KEY_PREFIX}${payloadToSend.nombre}`, JSON.stringify(prodData));
          } catch (e) {
            console.error("Failed to write product metadata to localStorage:", e);
          }

          return { data: { id: newId, ...prodData }, error: null };

        } else if (this.queryType === 'update') {
          const prodData = this.payload;
          const idFilter = this.filters.find(f => f.field === 'id');
          const targetId = idFilter ? String(idFilter.val) : '';

          if (targetId) {
            // Update rich metadata locally
            try {
              const existingRaw = localStorage.getItem(`${METADATA_KEY_PREFIX}${targetId}`);
              const existing = existingRaw ? JSON.parse(existingRaw) : {};
              const updated = { ...existing, ...prodData };
              localStorage.setItem(`${METADATA_KEY_PREFIX}${targetId}`, JSON.stringify(updated));
              if (updated.name) {
                localStorage.setItem(`${METADATA_KEY_PREFIX}${updated.name}`, JSON.stringify(updated));
              }
            } catch (e) {
              console.error("Failed to update product metadata in localStorage:", e);
            }

            // Sync main fields back to Python Backend database (PostgreSQL)
            const payloadToSend = {
              id: targetId,
              nombre: prodData.name || prodData.nombre || undefined,
              precio: prodData.price !== undefined ? Number(prodData.price) : undefined,
              stock: prodData.stock !== undefined ? Number(prodData.stock) : undefined,
              activo: prodData.is_published !== undefined ? !!prodData.is_published : undefined
            };

            await fetch('/api/productos/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
              body: JSON.stringify(payloadToSend)
            });
          }

          return { data: prodData, error: null };

        } else if (this.queryType === 'delete') {
          const idFilter = this.filters.find(f => f.field === 'id');
          const targetId = idFilter ? String(idFilter.val) : '';

          if (targetId) {
            localStorage.removeItem(`${METADATA_KEY_PREFIX}${targetId}`);

            // Delete from Python Backend database (PostgreSQL)
            await fetch('/api/productos/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
              body: JSON.stringify({ id: targetId })
            });
          }
          return { data: null, error: null };
        }
      }

      // Generic Handler for all other tables using /api/db/

      // 1. Fetch existing documents from the backend database for this table
      const res = await fetch(`/api/db/${this.table}`, {
        method: 'GET',
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch from backend table ${this.table}`);
      }
      const jsonRes = await res.json();
      let records = jsonRes.data || [];

      // 2. Seeding default data if database is empty and we have default mocks
      if (records.length === 0) {
        let defaults: any[] = [];
        if (this.table === 'categories') {
          defaults = MOCK_CATEGORIES;
        } else if (this.table === 'filters') {
          defaults = MOCK_FILTERS;
        } else if (this.table === 'filter_options') {
          defaults = MOCK_FILTER_OPTIONS;
        } else if (this.table === 'company_profile') {
          defaults = [MOCK_COMPANY_PROFILE];
        }

        if (defaults.length > 0) {
          records = [...defaults];
          // Seed in backend
          for (const d of defaults) {
            await fetch(`/api/db/${this.table}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
              body: JSON.stringify({ action: 'insert', id: d.id, data: d })
            });
          }
        }
      }

      // Additional hook for orders insert: trigger sale to python backend /api/venta
      if (this.table === 'orders' && this.queryType === 'insert') {
        const orderData = Array.isArray(this.payload) ? this.payload[0] : this.payload;
        const items = orderData.items || [];
        for (const item of items) {
          const salePayload = {
            producto_id: parseInt(item.id) || 1,
            nombre_a_vender: item.name || '',
            cantidad: Number(item.quantity) || 1,
            recibido: Number(item.price * item.quantity)
          };
          try {
            await fetch('/api/venta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
              body: JSON.stringify(salePayload)
            });
          } catch (e) {
            console.error("Failed to register sale:", e);
          }
        }
      }

      // 3. Handle different query types
      if (this.queryType === 'select') {
        const filtered = this.applyFilters(records);
        if (this.singleRow || this.maybeSingleRow) {
          return { data: filtered[0] || null, error: null };
        }
        return { data: filtered, error: null };
      }

      if (this.queryType === 'insert') {
        const docData = Array.isArray(this.payload) ? this.payload[0] : this.payload;
        const id = docData.id || `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const finalDoc = { id, created_at: docData.created_at || new Date().toISOString(), ...docData };

        const saveRes = await fetch(`/api/db/${this.table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
          body: JSON.stringify({ action: 'insert', id, data: finalDoc })
        });

        if (!saveRes.ok) {
          throw new Error(`Failed to insert record into backend table ${this.table}`);
        }

        return { data: [finalDoc], error: null };
      }

      if (this.queryType === 'update') {
        const updateData = this.payload;
        const filtered = this.applyFilters(records);

        const updatedRecords: any[] = [];
        for (const record of filtered) {
          const id = record.id;
          const mergedData = { ...record, ...updateData };

          const saveRes = await fetch(`/api/db/${this.table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
            body: JSON.stringify({ action: 'update', id, data: updateData })
          });

          if (!saveRes.ok) {
            throw new Error(`Failed to update record in backend table ${this.table}`);
          }
          updatedRecords.push(mergedData);
        }

        return { data: updatedRecords, error: null };
      }

      if (this.queryType === 'upsert') {
        const payloadObj = Array.isArray(this.payload) ? this.payload[0] : this.payload || {};
        const id = payloadObj.id || `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const finalDoc = { id, created_at: payloadObj.created_at || new Date().toISOString(), ...payloadObj };

        const saveRes = await fetch(`/api/db/${this.table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
          body: JSON.stringify({ action: 'upsert', id, data: finalDoc })
        });

        if (!saveRes.ok) {
          throw new Error(`Failed to upsert record in backend table ${this.table}`);
        }

        return { data: finalDoc, error: null };
      }

      if (this.queryType === 'delete') {
        const filtered = this.applyFilters(records);
        for (const record of filtered) {
          const id = record.id;
          const saveRes = await fetch(`/api/db/${this.table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
            body: JSON.stringify({ action: 'delete', id })
          });

          if (!saveRes.ok) {
            throw new Error(`Failed to delete record from backend table ${this.table}`);
          }
        }
        return { data: null, error: null };
      }
    } catch (err: any) {
      console.error(`[BackendDB Error] table: ${this.table}, action: ${this.queryType}`, err);
      return { data: null, error: err };
    }
  }
}

// Auth client connected directly to the Python backend API
export const auth = {
  async getSession() {
    const cached = localStorage.getItem(AUTH_SESSION_KEY);
    const token = getStoredAuthToken();
    if (cached && token) {
      try {
        const u = JSON.parse(cached);
        const mapped = {
          id: u.id,
          email: u.email,
          user_metadata: { name: u.name, sub_cuenta: u.sub_cuenta, liberta: u.liberta },
          subscription: u.subscription || null
        };
        return { data: { session: { user: mapped, access_token: token } }, error: null };
      } catch (e) { }
    }
    return { data: { session: null }, error: null };
  },

  onAuthStateChange(callback: any) {
    const checkAuth = () => {
      const cached = localStorage.getItem(AUTH_SESSION_KEY);
      let userObj = null;
      if (cached && getStoredAuthToken()) {
        try {
          const u = JSON.parse(cached);
          userObj = {
            id: u.id,
            email: u.email,
            user_metadata: { name: u.name, sub_cuenta: u.sub_cuenta, liberta: u.liberta },
            subscription: u.subscription || null
          };
        } catch (e) { }
      }
      const sessionObj = userObj ? { user: userObj } : null;
      callback('SIGNED_IN', sessionObj);
    };

    setTimeout(checkAuth, 0);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_backdoor_active' || e.key === 'auth_user_session') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            window.removeEventListener('storage', handleStorageChange);
          }
        }
      }
    };
  },

  async signInWithPassword({ email, password }: any) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (res.ok && json.success && json.user) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(json.user));
        if (json.user.access_token) {
          localStorage.setItem(AUTH_TOKEN_KEY, json.user.access_token);
        }
        const mappedUser = {
          id: json.user.id,
          email: json.user.email,
          user_metadata: { name: json.user.name, sub_cuenta: json.user.sub_cuenta, liberta: json.user.liberta },
          subscription: json.user.subscription || null
        };
        return { data: { user: mappedUser, session: { user: mappedUser, access_token: json.user.access_token } }, error: null };
      }
      return { data: { user: null, session: null }, error: new Error(json.message || "Credenciales inválidas.") };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err };
    }
  },

  async signUp({ email, password, options }: any) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: options?.data?.full_name || email.split('@')[0],
          phone: options?.data?.phone || '',
          address: options?.data?.address || ''
        })
      });
      const json = await res.json();
      if (res.ok && json.success && json.user) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(json.user));
        if (json.user.access_token) {
          localStorage.setItem(AUTH_TOKEN_KEY, json.user.access_token);
        }
        const mappedUser = {
          id: json.user.id,
          email: json.user.email,
          user_metadata: { name: json.user.name },
          subscription: json.user.subscription || null
        };
        return { data: { user: mappedUser, session: { user: mappedUser, access_token: json.user.access_token } }, error: null };
      }
      return { data: { user: null, session: null }, error: new Error(json.message || "Error al registrarse.") };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err };
    }
  },

  async signOut() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return { error: null };
  },

  async resend() {
    return { error: null };
  }
};

export const supabase = {
  auth,
  from(table: string) {
    return new MockQueryBuilder(table);
  }
};

export const db = supabase;
