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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
          contraseña VARCHAR(100) NOT NULL,
          sub_cuenta VARCHAR(100),
          liberta VARCHAR(10) DEFAULT 'no',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
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
          "INSERT INTO suscripciones (user_id, plan, status, is_demo, trial_ends_at) VALUES (%s, 'deluxe-ilimitado-websy', 'active', 1, null)",
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
          "INSERT INTO suscripciones (user_id, plan, status, is_demo, trial_ends_at) VALUES (%s, 'saas-super-admin', 'active', 1, null)",
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
