import { supabase, auth, db } from "./backendClient"

// Re-export Supabase as Firebase for backward compatibility
export { auth, db, supabase }

export function getAuthToken() {
  return localStorage.getItem('auth_access_token') || '';
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Firebase Storage compatibility - using Supabase Storage
export const storage = (supabase as any).storage || {
  from: () => ({
    upload: async () => ({ error: { message: 'Storage no configurado' } }),
    getPublicUrl: () => ({ data: { publicUrl: '' } })
  })
}

// Firebase Functions compatibility - using Supabase functions
export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: { email, name }
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error sending welcome email:', error)
    throw error
  }
}

// Firestore Compatibility layer
export function collection(dbInstance: any, path: string) {
  return { type: 'collection', path };
}

export function doc(parent: any, ...pathSegments: string[]) {
  let path = '';
  let id = '';
  if (parent && parent.type === 'collection') {
    path = parent.path;
    id = pathSegments[0];
  } else {
    path = pathSegments[0];
    id = pathSegments[1];
  }
  return { type: 'doc', path, id };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return {
    type: 'query',
    path: collectionRef.path,
    constraints: constraints.filter(Boolean)
  };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number) {
  return { type: 'limit', count };
}

export const increment = (n: number) => n;

export async function getDocs(queryRef: any) {
  const path = queryRef.path;
  let qb = db.from(path);
  
  if (queryRef.type === 'query' && queryRef.constraints) {
    for (const c of queryRef.constraints) {
      if (c.type === 'where') {
        if (c.op === '==' || c.op === 'eq') {
          qb = qb.eq(c.field, c.value);
        } else if (c.op === '>=') {
          qb = qb.gte(c.field, c.value);
        } else if (c.op === '<=') {
          qb = qb.lte(c.field, c.value);
        } else if (c.op === '>') {
          qb = qb.gt(c.field, c.value);
        } else if (c.op === '<') {
          qb = qb.lt(c.field, c.value);
        }
      } else if (c.type === 'limit') {
        qb = qb.limit(c.count);
      } else if (c.type === 'orderBy') {
        qb = qb.order(c.field, { ascending: c.direction === 'asc' });
      }
    }
  }
  
  const { data, error } = await qb;
  if (error) throw error;
  
  const docs = (data || []).map((item: any) => ({
    id: String(item.id || ''),
    data: () => item
  }));
  
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(cb: any) {
      docs.forEach(cb);
    }
  };
}

export async function getDoc(docRef: any) {
  const { data, error } = await db.from(docRef.path).eq('id', docRef.id).maybeSingle();
  if (error) throw error;
  
  return {
    exists: () => data !== null && data !== undefined,
    id: docRef.id,
    data: () => data || null
  };
}

export async function addDoc(collectionRef: any, data: any) {
  const docData = { ...data };
  if (!docData.id) {
    docData.id = `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  const { data: result, error } = await db.from(collectionRef.path).insert(docData);
  if (error) throw error;
  return {
    id: docData.id,
    ...result
  };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const docData = { id: docRef.id, ...data };
  const { error } = await db.from(docRef.path).upsert(docData);
  if (error) throw error;
  return {};
}

export async function updateDoc(docRef: any, data: any) {
  const { error } = await db.from(docRef.path).update(data).eq('id', docRef.id);
  if (error) throw error;
  return {};
}

export async function deleteDoc(docRef: any) {
  const { error } = await db.from(docRef.path).delete().eq('id', docRef.id);
  if (error) throw error;
  return {};
}

export function onSnapshot(queryRef: any, callback: (snapshot: any) => void, errorCallback?: (error: any) => void) {
  const handler = async () => {
    try {
      const snap = await getDocs(queryRef);
      callback(snap);
    } catch (e) {
      if (errorCallback) errorCallback(e);
    }
  };
  handler();
  const interval = setInterval(handler, 10000);
  return () => clearInterval(interval);
}

export async function runTransaction(dbInstance: any, callback: (transaction: any) => Promise<any>) {
  const transaction = {
    async get(docRef: any) {
      const { data, error } = await db.from(docRef.path).eq('id', docRef.id).maybeSingle();
      if (error) throw error;
      return {
        exists: () => data !== null && data !== undefined,
        id: docRef.id,
        data: () => data || null
      };
    },
    update(docRef: any, data: any) {
      db.from(docRef.path).update(data).eq('id', docRef.id);
    },
    set(docRef: any, data: any) {
      db.from(docRef.path).upsert({ id: docRef.id, ...data });
    },
    delete(docRef: any) {
      db.from(docRef.path).delete().eq('id', docRef.id);
    }
  };
  return await callback(transaction);
}