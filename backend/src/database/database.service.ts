import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client } from 'pg';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pgClient: Client | null = null;
  private sqliteDb: sqlite3.Database | null = null;
  private useSqlite = false;
  private dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'tienda.db');
  private posQueue: Promise<void> = Promise.resolve();

  /**
   * Ejecuta el cobro POS como una sola unidad: valida y descuenta inventario,
   * persiste el pedido, registra sus renglones de venta y el movimiento contable.
   * La cola evita que dos cajas compartiendo este proceso vendan el mismo stock.
   */
  async registerPosSale(input: any): Promise<any> {
    let release!: () => void;
    const previous = this.posQueue;
    this.posQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;

    try {
      return await this.registerPosSaleTransaction(input);
    } finally {
      release();
    }
  }

  private async registerPosSaleTransaction(input: any): Promise<any> {
    const requestedItems = Array.isArray(input?.items) ? input.items : [];
    if (!requestedItems.length) throw new Error('La venta debe incluir al menos un producto.');

    const orderId = String(input?.id || `sale-${Date.now()}`);
    const paymentMethod = String(input?.paymentMethod || 'efectivo');
    if (!['efectivo', 'tarjeta', 'transferencia'].includes(paymentMethod)) {
      throw new Error('El método de pago no es válido.');
    }

    const begin = this.useSqlite ? 'BEGIN IMMEDIATE' : 'BEGIN';
    await this.query(begin);
    try {
      const normalizedItems: any[] = [];
      const updatedStocks: any[] = [];

      for (const rawItem of requestedItems) {
        const quantity = Number(rawItem?.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
          throw new Error(`Cantidad inválida para "${rawItem?.name || 'producto'}".`);
        }

        const rawId = String(rawItem?.id || '');
        if (rawId.startsWith('generic-')) {
          const price = Number(rawItem?.price);
          if (!Number.isFinite(price) || price <= 0) throw new Error('El precio del artículo libre no es válido.');
          normalizedItems.push({ id: rawId, name: String(rawItem?.name || 'Artículo libre'), price, quantity, image: rawItem?.image || '' });
          continue;
        }

        const productId = Number(rawId);
        if (!Number.isInteger(productId) || productId <= 0) throw new Error(`Producto inválido: ${rawItem?.name || rawId}`);
        const lockClause = this.useSqlite ? '' : ' FOR UPDATE';
        const rows = await this.query(
          `SELECT id, nombre, precio, stock, activo FROM productos WHERE id = %s${lockClause}`,
          [productId]
        );
        if (!rows.length) throw new Error(`El producto "${rawItem?.name || rawId}" ya no existe.`);

        const product = rows[0];
        const active = product.activo === true || product.activo === 1 || product.activo === 'true';
        const currentStock = Number(product.stock || 0);
        if (!active) throw new Error(`El producto "${product.nombre}" está inactivo.`);
        if (!Number.isFinite(currentStock) || currentStock < quantity) {
          throw new Error(`${product.nombre}: stock disponible ${Math.max(0, currentStock)}, solicitado ${quantity}.`);
        }

        const update = await this.query(
          'UPDATE productos SET stock = stock - %s WHERE id = %s AND stock >= %s',
          [quantity, productId, quantity]
        );
        if (Number(update[0]?.changes ?? 1) !== 1) throw new Error(`${product.nombre}: el stock cambió durante el cobro.`);

        const newStock = currentStock - quantity;
        const price = Number(product.precio || 0);
        normalizedItems.push({ id: String(productId), name: product.nombre, price, quantity, image: rawItem?.image || '' });
        updatedStocks.push({ id: String(productId), name: product.nombre, newStock });
      }

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discountType = ['percentage', 'fixed'].includes(input?.discountType) ? input.discountType : 'none';
      const discountValue = Math.max(0, Number(input?.discountValue || 0));
      const discountAmount = discountType === 'percentage'
        ? subtotal * Math.min(discountValue, 100) / 100
        : discountType === 'fixed' ? Math.min(discountValue, subtotal) : 0;
      const total = Math.max(0, subtotal - discountAmount);
      const received = Number(input?.amountReceived || 0);
      if (paymentMethod === 'efectivo' && (!Number.isFinite(received) || received < total)) {
        throw new Error(`El efectivo recibido es menor al total de la venta.`);
      }

      const now = new Date().toISOString();
      const order = {
        id: orderId,
        user_id: input?.userId || null,
        userName: String(input?.customerName || 'Cliente General').trim() || 'Cliente General',
        user_name: String(input?.customerName || 'Cliente General').trim() || 'Cliente General',
        userEmail: input?.customerEmail || null,
        user_email: input?.customerEmail || null,
        userPhone: input?.customerPhone || null,
        user_phone: input?.customerPhone || null,
        items: normalizedItems,
        subtotal,
        discountType,
        discount_type: discountType,
        discountValue,
        discount_value: discountValue,
        discountAmount,
        discount_amount: discountAmount,
        total,
        amountReceived: paymentMethod === 'efectivo' ? received : total,
        changeAmount: paymentMethod === 'efectivo' ? received - total : 0,
        paymentMethod,
        payment_method: paymentMethod,
        status: 'confirmed',
        createdAt: now,
        created_at: now,
        confirmedAt: now,
        orderType: 'physical',
        order_type: 'physical',
        physicalSale: true,
        physical_sale: true,
        orderNotes: input?.notes || null,
        order_notes: input?.notes || null,
        employee_id: input?.employeeId || null,
        employee_name: input?.employeeName || 'Vendedor',
        employeeId: input?.employeeId || null,
        employeeName: input?.employeeName || 'Vendedor',
        billingLineId: input?.billingLineId || 'none',
        billing_line_id: input?.billingLineId || 'none'
      };

      await this.query(
        'INSERT INTO documentos (tabla_nombre, id, datos) VALUES (%s, %s, %s)',
        ['orders', orderId, JSON.stringify(order)]
      );

      for (const item of normalizedItems.filter((item) => !String(item.id).startsWith('generic-'))) {
        const proportionalTotal = subtotal > 0 ? (item.price * item.quantity * total) / subtotal : 0;
        await this.query(
          'INSERT INTO ventas (producto_id, cantidad, total, fecha) VALUES (%s, %s, %s, NOW())',
          [Number(item.id), item.quantity, proportionalTotal]
        );
        await this.query(
          'INSERT INTO historial_modificaciones (producto_id, usuario_correo) VALUES (%s, %s)',
          [Number(item.id), input?.employeeEmail || 'venta_pos@merco.com']
        );
      }

      await this.query(
        'INSERT INTO contabilidad (tipo, concepto, monto, metodo_pago, referencia_id) VALUES (%s, %s, %s, %s, %s)',
        ['ingreso', `Venta POS - Cliente: ${order.userName}`, total, paymentMethod, orderId]
      );

      await this.query('COMMIT');
      return { order, updatedStocks, accountingRegistered: true };
    } catch (error) {
      try { await this.query('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }

  async onModuleInit() {
    await this.initializeDatabase();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async initializeDatabase() {
    if (process.env.DB_USE_SQLITE === 'true') {
      this.useSqlite = true;
      console.log('[DB] Forzando uso de SQLite por DB_USE_SQLITE=true');
    }

    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = Number(process.env.DB_PORT || 5432);
    const dbName = process.env.DB_NAME || 'tienda';
    const dbUser = process.env.DB_USER || 'posgrest';
    const dbPassword = process.env.DB_PASSWORD || '123';

    if (!this.useSqlite) {
      try {
        console.log(`[DB] Intentando conectar a PostgreSQL en ${dbHost}:${dbPort}...`);

        const pgConnectPromise = new Promise<Client>((resolve, reject) => {
          const client = new Client({
            host: dbHost,
            port: dbPort,
            database: dbName,
            user: dbUser,
            password: dbPassword,
          });
          client.connect((err) => {
            if (err) reject(err);
            else resolve(client);
          });
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PG connection timeout')), 3000)
        );

        this.pgClient = await Promise.race([pgConnectPromise, timeoutPromise]);
        this.useSqlite = false;
        console.log('[DB] Conectado a PostgreSQL con éxito.');
      } catch (e: any) {
        this.useSqlite = true;
        console.log(`[DB] No se pudo conectar a PostgreSQL: ${e.message}. Usando SQLite en: ${this.dbPath}`);
      }
    }

    if (this.useSqlite) {
      await new Promise<void>((resolve, reject) => {
        this.sqliteDb = new sqlite3.Database(this.dbPath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await this.crearTablas();
    await this.seedDefaultAdmin();
    await this.migrateAgencyOwnership();
  }

  private async crearTablas() {
    if (this.useSqlite) {
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          precio REAL NOT NULL,
          stock REAL NOT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          activo INTEGER DEFAULT 1
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          correo TEXT UNIQUE NOT NULL,
          contraseña TEXT NOT NULL,
          sub_cuenta TEXT,
          liberta TEXT DEFAULT 'no',
          account_role TEXT DEFAULT 'agency_owner',
          agency_id TEXT,
          parent_user_id TEXT,
          permissions TEXT DEFAULT '{}',
          active INTEGER DEFAULT 1,
          phone TEXT,
          totp_secret TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          company TEXT,
          tags TEXT,
          avatar TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS suscripciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          plan TEXT NOT NULL,
          status TEXT NOT NULL,
          is_demo INTEGER DEFAULT 0,
          trial_ends_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES usuarios(id)
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS documentos (
          tabla_nombre TEXT NOT NULL,
          id TEXT NOT NULL,
          datos TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tabla_nombre, id)
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS ventas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          producto_id INTEGER NOT NULL,
          cantidad REAL NOT NULL,
          total REAL NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          contact_id INTEGER,
          due_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts(id)
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS historial_modificaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          producto_id INTEGER NOT NULL,
          usuario_correo TEXT NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS facturas_electronicas (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          uuid TEXT NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total REAL NOT NULL,
          estatus TEXT NOT NULL,
          billing_line_id TEXT
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS agencias (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          logo TEXT,
          plan TEXT DEFAULT 'basic',
          status TEXT DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS agencia_miembros (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agency_id TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL DEFAULT 'agency_user',
          permissions TEXT DEFAULT '{}',
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(agency_id, user_id)
        );
      `);
      await this.runSqlite(`
        CREATE TABLE IF NOT EXISTS contabilidad (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT NOT NULL,
          concepto TEXT NOT NULL,
          monto REAL NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metodo_pago TEXT,
          referencia_id TEXT
        );
      `);
      try {
        await this.runSqlite("ALTER TABLE usuarios ADD COLUMN totp_secret TEXT;");
      } catch (_) {}
      for (const statement of [
        "ALTER TABLE usuarios ADD COLUMN account_role TEXT DEFAULT 'agency_owner';",
        'ALTER TABLE usuarios ADD COLUMN agency_id TEXT;',
        'ALTER TABLE usuarios ADD COLUMN parent_user_id TEXT;',
        "ALTER TABLE usuarios ADD COLUMN permissions TEXT DEFAULT '{}';",
        'ALTER TABLE usuarios ADD COLUMN active INTEGER DEFAULT 1;',
        'ALTER TABLE usuarios ADD COLUMN phone TEXT;',
        'ALTER TABLE usuarios ADD COLUMN email_2fa_enabled INTEGER DEFAULT 0;',
        'ALTER TABLE usuarios ADD COLUMN backup_codes TEXT;',
        'ALTER TABLE usuarios ADD COLUMN updated_at TIMESTAMP;'
      ]) {
        try { await this.runSqlite(statement); } catch (_) {}
      }
      try {
        await this.runSqlite('UPDATE usuarios SET updated_at = created_at WHERE updated_at IS NULL;');
      } catch (_) {}
      try {
        await this.runSqlite("ALTER TABLE facturas_electronicas ADD COLUMN billing_line_id TEXT;");
      } catch (_) {}
    } else {
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS productos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          precio NUMERIC(10, 2) NOT NULL,
          stock NUMERIC(10, 2) NOT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          activo BOOLEAN DEFAULT TRUE
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          correo VARCHAR(100) UNIQUE NOT NULL,
          contraseña VARCHAR(255) NOT NULL,
          sub_cuenta VARCHAR(100),
          liberta VARCHAR(10) DEFAULT 'no',
          account_role VARCHAR(30) DEFAULT 'agency_owner',
          agency_id VARCHAR(100),
          parent_user_id VARCHAR(100),
          permissions TEXT DEFAULT '{}',
          active BOOLEAN DEFAULT TRUE,
          phone VARCHAR(100),
          totp_secret VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await this.runPg('ALTER TABLE usuarios ALTER COLUMN contraseña TYPE VARCHAR(255);');
      } catch (_) {}
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(100),
          email VARCHAR(255),
          company VARCHAR(255),
          tags TEXT,
          avatar VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS suscripciones (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          plan VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          is_demo BOOLEAN DEFAULT FALSE,
          trial_ends_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES usuarios(id)
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS documentos (
          tabla_nombre VARCHAR(100) NOT NULL,
          id VARCHAR(100) NOT NULL,
          datos TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tabla_nombre, id)
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS ventas (
          id SERIAL PRIMARY KEY,
          producto_id INTEGER NOT NULL,
          cantidad NUMERIC(10, 2) NOT NULL,
          total NUMERIC(10, 2) NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          contact_id INTEGER,
          due_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts(id)
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS historial_modificaciones (
          id SERIAL PRIMARY KEY,
          producto_id INTEGER NOT NULL,
          usuario_correo VARCHAR(255) NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS facturas_electronicas (
          id VARCHAR(255) PRIMARY KEY,
          order_id VARCHAR(255) NOT NULL,
          uuid VARCHAR(255) NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total NUMERIC(10, 2) NOT NULL,
          estatus VARCHAR(50) NOT NULL,
          billing_line_id VARCHAR(255)
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS agencias (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          owner_id VARCHAR(100) NOT NULL,
          logo TEXT,
          plan VARCHAR(100) DEFAULT 'basic',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS agencia_miembros (
          id SERIAL PRIMARY KEY,
          agency_id VARCHAR(100) NOT NULL,
          user_id INTEGER NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'agency_user',
          permissions TEXT DEFAULT '{}',
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(agency_id, user_id)
        );
      `);
      await this.runPg(`
        CREATE TABLE IF NOT EXISTS contabilidad (
          id SERIAL PRIMARY KEY,
          tipo VARCHAR(50) NOT NULL,
          concepto VARCHAR(255) NOT NULL,
          monto NUMERIC(10, 2) NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metodo_pago VARCHAR(50),
          referencia_id VARCHAR(100)
        );
      `);
      try {
        await this.runPg("ALTER TABLE usuarios ADD COLUMN totp_secret VARCHAR(255);");
      } catch (_) {}
      for (const statement of [
        "ALTER TABLE usuarios ADD COLUMN account_role VARCHAR(30) DEFAULT 'agency_owner';",
        'ALTER TABLE usuarios ADD COLUMN agency_id VARCHAR(100);',
        'ALTER TABLE usuarios ADD COLUMN parent_user_id VARCHAR(100);',
        "ALTER TABLE usuarios ADD COLUMN permissions TEXT DEFAULT '{}';",
        'ALTER TABLE usuarios ADD COLUMN active BOOLEAN DEFAULT TRUE;',
        'ALTER TABLE usuarios ADD COLUMN phone VARCHAR(100);',
        'ALTER TABLE usuarios ADD COLUMN email_2fa_enabled BOOLEAN DEFAULT FALSE;',
        'ALTER TABLE usuarios ADD COLUMN backup_codes TEXT;',
        'ALTER TABLE usuarios ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;'
      ]) {
        try { await this.runPg(statement); } catch (_) {}
      }
      try {
        await this.runPg("ALTER TABLE facturas_electronicas ADD COLUMN billing_line_id VARCHAR(255);");
      } catch (_) {}
    }
  }

  private async seedDefaultAdmin() {
    try {
      const email = 'admin@gmail.com';
      const rows = await this.query('SELECT id FROM usuarios WHERE correo = %s', [email]);
      if (rows.length === 0) {
        console.log('[DB] Seeding default admin user (admin@gmail.com)...');
        // Insert admin user
        const insertResult = await this.query(
          "INSERT INTO usuarios (nombre, correo, contraseña, sub_cuenta, liberta) VALUES ('Administrador Principal', 'admin@gmail.com', 'admin123', null, 'si') RETURNING id"
        );
        const adminId = insertResult[0]?.id || 1;

        // Also seed subscription
        await this.query(
          "INSERT INTO suscripciones (user_id, plan, status, is_demo, trial_ends_at) VALUES (%s, 'deluxe-ilimitado-websy', 'active', true, null)",
          [adminId]
        );
        console.log('[DB] Default admin user seeded successfully with ID:', adminId);
      } else {
        console.log('[DB] Default admin user already exists.');
      }

      // Seed super admin juansalazat100@gmail.com
      const superEmail = 'juansalazat100@gmail.com';
      const superRows = await this.query('SELECT id FROM usuarios WHERE correo = %s', [superEmail]);
      if (superRows.length === 0) {
        console.log('[DB] Seeding super admin user (juansalazat100@gmail.com)...');
        const insertResult = await this.query(
          "INSERT INTO usuarios (nombre, correo, contraseña, sub_cuenta, liberta) VALUES ('Juan Salazar', 'juansalazat100@gmail.com', 'rocky454', 'saas-admin', 'si') RETURNING id"
        );
        const superId = insertResult[0]?.id || 2;
        await this.query(
          "INSERT INTO suscripciones (user_id, plan, status, is_demo, trial_ends_at) VALUES (%s, 'saas-super-admin', 'active', true, null)",
          [superId]
        );
        console.log('[DB] Super admin user seeded successfully with ID:', superId);
      } else {
        console.log('[DB] Super admin user already exists.');
      }
    } catch (e: any) {
      console.error('[DB] Error seeding default admin/superadmin users:', e.message);
    }
  }

  private async migrateAgencyOwnership() {
    const users = await this.query(
      'SELECT id, nombre, correo, sub_cuenta, account_role, agency_id, parent_user_id, permissions, active FROM usuarios ORDER BY id ASC'
    );
    const defaultOwner = users.find((user) => !user.sub_cuenta) || null;

    for (const user of users) {
      const id = String(user.id);
      if (user.sub_cuenta === 'saas-admin') {
        await this.query(
          'UPDATE usuarios SET account_role = %s, agency_id = NULL, parent_user_id = NULL WHERE id = %s',
          ['saas_admin', id]
        );
        continue;
      }

      if (user.sub_cuenta === 'si') {
        const agencyId = user.agency_id || (defaultOwner ? String(defaultOwner.id) : null);
        await this.query(
          'UPDATE usuarios SET account_role = %s, agency_id = %s, parent_user_id = COALESCE(parent_user_id, %s) WHERE id = %s',
          ['agency_user', agencyId, agencyId, id]
        );
        continue;
      }

      await this.query(
        'UPDATE usuarios SET account_role = %s, agency_id = %s, parent_user_id = NULL WHERE id = %s',
        ['agency_owner', id, id]
      );
    }

    // Populate agencias and agencia_miembros
    for (const user of users) {
      const id = String(user.id);
      if (user.sub_cuenta === 'saas-admin') continue;

      const isOwner = !user.sub_cuenta || user.sub_cuenta === 'no' || user.account_role === 'agency_owner';
      if (isOwner) {
        const existingAgency = await this.query('SELECT id FROM agencias WHERE id = %s', [id]);
        if (!existingAgency.length) {
          const agencyName = user.nombre ? `${user.nombre}` : 'Mi Agencia';
          await this.query(
            'INSERT INTO agencias (id, name, owner_id, plan, status, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
            [id, agencyName, id, 'basic', 'active']
          );
        }

        const existingMember = await this.query(
          'SELECT id FROM agencia_miembros WHERE agency_id = %s AND user_id = %s',
          [id, user.id]
        );
        if (!existingMember.length) {
          await this.query(
            'INSERT INTO agencia_miembros (agency_id, user_id, role, permissions, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
            [id, user.id, 'agency_owner', user.permissions || '{}', user.active !== 0 && user.active !== false ? 1 : 0]
          );
        }
      } else {
        const targetAgencyId = user.agency_id || (defaultOwner ? String(defaultOwner.id) : null);
        if (targetAgencyId) {
          // Ensure target agency exists
          const existingAgency = await this.query('SELECT id FROM agencias WHERE id = %s', [targetAgencyId]);
          if (!existingAgency.length) {
            await this.query(
              'INSERT INTO agencias (id, name, owner_id, plan, status, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
              [targetAgencyId, 'Mi Agencia', targetAgencyId, 'basic', 'active']
            );
          }

          const existingMember = await this.query(
            'SELECT id FROM agencia_miembros WHERE agency_id = %s AND user_id = %s',
            [targetAgencyId, user.id]
          );
          if (!existingMember.length) {
            await this.query(
              'INSERT INTO agencia_miembros (agency_id, user_id, role, permissions, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
              [targetAgencyId, user.id, 'agency_user', user.permissions || '{}', user.active !== 0 && user.active !== false ? 1 : 0]
            );
          }
        }
      }
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (this.useSqlite) {
      // Traducir marcador %s a ?
      let sqliteSql = sql.replace(/%s/g, '?');
      // Traducir NOW()
      sqliteSql = sqliteSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

      // Traducir RETURNING id
      let returningId = false;
      if (sqliteSql.includes('RETURNING id') || sqliteSql.includes('RETURNING id'.toUpperCase())) {
        sqliteSql = sqliteSql.replace(/RETURNING id/gi, '').trim();
        returningId = true;
      }

      return new Promise<any[]>((resolve, reject) => {
        const queryLower = sqliteSql.toLowerCase().trim();
        if (queryLower.startsWith('insert') || queryLower.startsWith('update') || queryLower.startsWith('delete')) {
          this.sqliteDb!.run(sqliteSql, params, function (err) {
            if (err) reject(err);
            else {
              if (returningId && queryLower.startsWith('insert')) {
                resolve([{ id: this.lastID }]);
              } else {
                resolve([{ changes: this.changes }]);
              }
            }
          });
        } else {
          this.sqliteDb!.all(sqliteSql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }
      });
    } else {
      // Traducir marcador %s a $1, $2, $3, ...
      let index = 1;
      const pgSql = sql.replace(/%s/g, () => `$${index++}`);
      const res = await this.pgClient!.query(pgSql, params);
      return res.rows || [];
    }
  }

  private runSqlite(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sqliteDb!.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async runPg(sql: string): Promise<void> {
    await this.pgClient!.query(sql);
  }

  async close() {
    if (this.pgClient) {
      await this.pgClient.end();
      this.pgClient = null;
    }
    if (this.sqliteDb) {
      await new Promise<void>((resolve, reject) => {
        this.sqliteDb!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.sqliteDb = null;
    }
  }
}
