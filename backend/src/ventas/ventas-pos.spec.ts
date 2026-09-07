import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';

describe('Venta POS transaccional', () => {
  let db: DatabaseService;
  let tempDir: string;
  let dbPath: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merco-pos-'));
    dbPath = path.join(tempDir, 'pos-test.db');
    process.env.DB_USE_SQLITE = 'true';
    process.env.DB_PATH = dbPath;
    db = new DatabaseService();
    await db.onModuleInit();
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    delete process.env.DB_PATH;
  });

  const createProduct = async (name: string, price: number, stock: number) => {
    const result = await db.query(
      'INSERT INTO productos (nombre, precio, stock, activo) VALUES (%s, %s, %s, %s) RETURNING id',
      [name, price, stock, true]
    );
    return String(result[0].id);
  };

  it('guarda pedido, descuenta stock y registra caja/contabilidad en una sola venta', async () => {
    const productId = await createProduct('Café premium', 100, 5);
    const result = await db.registerPosSale({
      id: 'sale-complete',
      items: [{ id: productId, name: 'Nombre manipulado', price: 1, quantity: 2 }],
      customerName: 'Cliente prueba',
      paymentMethod: 'efectivo',
      amountReceived: 250,
      discountType: 'percentage',
      discountValue: 10,
    });

    expect(result.order.subtotal).toBe(200);
    expect(result.order.total).toBe(180);
    expect(result.order.changeAmount).toBe(70);
    expect(result.order.items[0].name).toBe('Café premium');
    expect(Number((await db.query('SELECT stock FROM productos WHERE id = %s', [productId]))[0].stock)).toBe(3);
    expect((await db.query("SELECT * FROM documentos WHERE tabla_nombre = 'orders' AND id = %s", ['sale-complete']))).toHaveLength(1);
    expect((await db.query('SELECT * FROM ventas WHERE producto_id = %s', [productId]))).toHaveLength(1);
    expect((await db.query('SELECT * FROM contabilidad WHERE referencia_id = %s', ['sale-complete']))).toHaveLength(1);
  });

  it('revierte toda la operación cuando una línea no tiene stock', async () => {
    const availableId = await createProduct('Disponible', 30, 4);
    const unavailableId = await createProduct('Agotado', 20, 0);

    await expect(db.registerPosSale({
      id: 'sale-rollback',
      items: [
        { id: availableId, quantity: 2 },
        { id: unavailableId, quantity: 1 },
      ],
      paymentMethod: 'tarjeta',
    })).rejects.toThrow(/stock disponible/i);

    expect(Number((await db.query('SELECT stock FROM productos WHERE id = %s', [availableId]))[0].stock)).toBe(4);
    expect((await db.query("SELECT * FROM documentos WHERE tabla_nombre = 'orders' AND id = %s", ['sale-rollback']))).toHaveLength(0);
    expect((await db.query('SELECT * FROM contabilidad WHERE referencia_id = %s', ['sale-rollback']))).toHaveLength(0);
  });

  it('impide sobreventa cuando dos cajas cobran la última unidad a la vez', async () => {
    const productId = await createProduct('Última unidad', 75, 1);
    const sale = (id: string) => db.registerPosSale({
      id,
      items: [{ id: productId, quantity: 1 }],
      paymentMethod: 'transferencia',
    });

    const results = await Promise.allSettled([sale('sale-concurrent-a'), sale('sale-concurrent-b')]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(Number((await db.query('SELECT stock FROM productos WHERE id = %s', [productId]))[0].stock)).toBe(0);
  });

  it('no descuenta inventario si el efectivo recibido no alcanza', async () => {
    const productId = await createProduct('Pago controlado', 120, 2);
    await expect(db.registerPosSale({
      id: 'sale-insufficient-cash',
      items: [{ id: productId, quantity: 1 }],
      paymentMethod: 'efectivo',
      amountReceived: 100,
    })).rejects.toThrow(/efectivo recibido/i);

    expect(Number((await db.query('SELECT stock FROM productos WHERE id = %s', [productId]))[0].stock)).toBe(2);
    expect((await db.query("SELECT * FROM documentos WHERE tabla_nombre = 'orders' AND id = %s", ['sale-insufficient-cash']))).toHaveLength(0);
  });
});
