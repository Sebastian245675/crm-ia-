// Datos simulados para cuando Firestore no está disponible debido a errores de permisos
// Esto permite que la aplicación siga funcionando mientras se configuran las reglas

class SimulatedDB {
  private static instance: SimulatedDB;
  private collections: Record<string, Record<string, any[]>>;
  private isSimulated: boolean = false;

  private constructor() {
    this.collections = {
      products: {},
      users: {},
      categories: {},
      orders: {},
    };
  }

  public static getInstance(): SimulatedDB {
    if (!SimulatedDB.instance) {
      SimulatedDB.instance = new SimulatedDB();
    }
    return SimulatedDB.instance;
  }

  setSimulationMode(isSimulated: boolean) {
    this.isSimulated = isSimulated;

    if (isSimulated) {
      // Datos de ejemplo
      this.addData("categories", {
        id: "electrodomesticos",
        name: "Electrodomésticos",
        image: "https://via.placeholder.com/150",
        parent: null
      });
      this.addData("categories", {
        id: "cocina",
        name: "Cocina",
        image: "https://via.placeholder.com/150",
        parent: "electrodomesticos"
      });

      // Productos de ejemplo
      this.addData("products", {
        id: "producto1",
        name: "Licuadora Multiuso",
        description: "Licuadora potente con múltiples velocidades",
        price: 59.99,
        category: "cocina",
        image: "https://via.placeholder.com/300",
        stock: 10
      });

      this.addData("products", {
        id: "producto2",
        name: "Microondas Digital",
        description: "Microondas de última generación",
        price: 129.99,
        category: "electrodomesticos",
        image: "https://via.placeholder.com/300",
        stock: 5
      });

      // Usuario admin
      this.addData("users", {
        id: "admin-id",
        name: "Administrador",
        email: "admin@tienda.com",
        isAdmin: true
      });
    }
  }

  isSimulationActive() {
    return this.isSimulated;
  }

  addData(collection: string, data: any) {
    if (!this.collections[collection]) {
      this.collections[collection] = {};
    }
    this.collections[collection][data.id] = data;
  }

  getCollection(collection: string) {
    return Object.values(this.collections[collection] || {});
  }

  getDocument(collection: string, id: string) {
    return this.collections[collection]?.[id];
  }

  // Métodos para simular operaciones de Firestore
  async getCollectionData(collection: string): Promise<any[]> {
    if (!this.isSimulated) return [];
    return this.getCollection(collection);
  }

  async getDocumentData(collection: string, id: string): Promise<any> {
    if (!this.isSimulated) return null;
    return this.getDocument(collection, id);
  }

  async addDocumentData(collection: string, id: string, data: any): Promise<void> {
    if (!this.isSimulated) return;
    this.addData(collection, { id, ...data });
  }

  async updateDocumentData(collection: string, id: string, data: any): Promise<void> {
    if (!this.isSimulated) return;
    const existingData = this.getDocument(collection, id);
    if (existingData) {
      this.collections[collection][id] = { ...existingData, ...data };
    }
  }

  async deleteDocumentData(collection: string, id: string): Promise<void> {
    if (!this.isSimulated) return;
    if (this.collections[collection] && this.collections[collection][id]) {
      delete this.collections[collection][id];
    }
  }
}

export const simulatedDB = SimulatedDB.getInstance();
