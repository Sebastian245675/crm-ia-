import { db } from '@/firebase';
import { simulatedDB } from './simulatedDB';

// Wrapper para acceder a documentos y colecciones con fallback a la DB simulada

// Obtener una colección completa
export async function getCollection(collectionName: string) {
  try {
    const { data, error } = await db.from(collectionName).select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    // Fallback to simulated DB
    return simulatedDB.getCollectionData(collectionName);
  }
}

// Obtener un documento por ID
export async function getDocumentById(collectionName: string, docId: string) {
  try {
    const { data, error } = await db
      .from(collectionName)
      .select('*')
      .eq('id', docId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error(`Error getting document ${collectionName}/${docId}:`, error);
    // Fallback to simulated DB
    return simulatedDB.getDocumentData(collectionName, docId);
  }
}

// Consulta filtrada por campo
export async function queryCollection(collectionName: string, fieldName: string, value: any) {
  try {
    const { data, error } = await db
      .from(collectionName)
      .select('*')
      .eq(fieldName, value);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error querying ${collectionName} where ${fieldName}=${value}:`, error);
    // Fallback: manually filter in simulated DB
    const allDocs = await simulatedDB.getCollectionData(collectionName);
    return allDocs.filter(doc => doc[fieldName] === value);
  }
}

// Crear un nuevo documento con ID personalizado
export async function createDocumentWithId(collectionName: string, docId: string, data: any) {
  try {
    const { error } = await db
      .from(collectionName)
      .insert([{ id: docId, ...data }]);
    
    if (error) throw error;
    return { id: docId, ...data };
  } catch (error) {
    console.error(`Error creating document ${collectionName}/${docId}:`, error);
    // Create in simulated DB
    await simulatedDB.addDocumentData(collectionName, docId, data);
    return { id: docId, ...data };
  }
}

// Crear un documento con ID automático
export async function createDocument(collectionName: string, data: any) {
  try {
    const { data: insertedData, error } = await db
      .from(collectionName)
      .insert([data])
      .select();
    
    if (error) throw error;
    return insertedData?.[0] || { ...data };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    // Create in simulated DB with generated ID
    const id = `simulated-${Date.now()}`;
    await simulatedDB.addDocumentData(collectionName, id, data);
    return { id, ...data };
  }
}

// Actualizar un documento
export async function updateDocument(collectionName: string, docId: string, data: any) {
  try {
    const { error } = await db
      .from(collectionName)
      .update(data)
      .eq('id', docId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error updating document ${collectionName}/${docId}:`, error);
    // Update in simulated DB
    await simulatedDB.updateDocumentData(collectionName, docId, data);
    return true;
  }
}

// Eliminar un documento
export async function deleteDocument(collectionName: string, docId: string) {
  try {
    const { error } = await db
      .from(collectionName)
      .delete()
      .eq('id', docId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting document ${collectionName}/${docId}:`, error);
    // Delete in simulated DB
    await simulatedDB.deleteDocumentData(collectionName, docId);
    return true;
  }
}
