import { Controller, Get, Post, Body, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as express from 'express';

@Controller('api/productos')
export class ProductsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async getProductos(@Res() res: express.Response) {
    try {
      const rows = await this.db.query(
        'SELECT id, nombre, precio, stock, fecha_creacion, activo FROM productos ORDER BY id'
      );

      const mapped = rows.map((row) => ({
        id: row.id,
        name: row.nombre,
        price: Number(row.precio || 0),
        stock: Number(row.stock || 0),
        date: row.fecha_creacion || '',
        activo: row.activo === true || row.activo === 1 || row.activo === 'true',
      }));

      // Calcular la caja sumando las ventas persistidas
      const ventasRows = await this.db.query('SELECT SUM(total) as total_caja FROM ventas');
      const totalCaja = Number(ventasRows[0]?.total_caja || 0);

      return res.status(HttpStatus.OK).json({
        productos: mapped,
        caja: totalCaja,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al obtener productos: ${e.message}`,
      });
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createProducto(@Body() body: any, @Res() res: express.Response) {
    try {
      const nombre = body.nombre || body.name || '';
      const precio = Number(body.precio || body.price || 0);
      const stock = Number(body.stock || 0);
      const activo = body.activo !== false;

      const logs = [`Producto recibido: ${nombre}, Precio: ${precio}, Stock: ${stock}`];

      // Inserción en tabla productos
      const result = await this.db.query(
        'INSERT INTO productos (nombre, precio, stock, fecha_creacion, activo) VALUES (%s, %s, %s, NOW(), %s) RETURNING id',
        [nombre, precio, stock, activo]
      );

      const nuevoId = result[0]?.id || null;

      // Registrar en el historial de modificaciones
      if (nuevoId) {
        await this.db.query(
          'INSERT INTO historial_modificaciones (producto_id, usuario_correo) VALUES (%s, %s)',
          [nuevoId, 'bot_whatsapp@ferreteria.com']
        );
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        id: nuevoId,
        logs,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al registrar producto: ${e.message}`,
      });
    }
  }

  @Post('update')
  @UseGuards(JwtAuthGuard)
  async updateProducto(@Body() body: any, @Res() res: express.Response) {
    try {
      const prodId = body.id;
      if (!prodId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'ID de producto es requerido',
        });
      }

      // Obtener el producto actual
      const rows = await this.db.query(
        'SELECT nombre, precio, stock, activo FROM productos WHERE id = %s',
        [prodId]
      );

      if (rows.length === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Producto no encontrado',
        });
      }

      const current = rows[0];
      const newNombre = body.nombre !== undefined ? body.nombre : (body.name !== undefined ? body.name : current.nombre);
      const newPrecio = body.precio !== undefined ? Number(body.precio) : (body.price !== undefined ? Number(body.price) : Number(current.precio));
      const newStock = body.stock !== undefined ? Number(body.stock) : Number(current.stock);
      const newActivo = body.activo !== undefined ? (body.activo === true || body.activo === 1) : (current.activo === true || current.activo === 1);

      await this.db.query(
        'UPDATE productos SET nombre = %s, precio = %s, stock = %s, activo = %s WHERE id = %s',
        [newNombre, newPrecio, newStock, newActivo, prodId]
      );

      // Registrar modificación en el historial
      await this.db.query(
        'INSERT INTO historial_modificaciones (producto_id, usuario_correo) VALUES (%s, %s)',
        [prodId, 'bot_whatsapp@ferreteria.com']
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Producto actualizado exitosamente',
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al actualizar producto: ${e.message}`,
      });
    }
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard)
  async deleteProducto(@Body() body: any, @Res() res: express.Response) {
    try {
      const prodId = body.id;
      if (!prodId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'ID de producto es requerido',
        });
      }

      await this.db.query('DELETE FROM productos WHERE id = %s', [prodId]);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Producto eliminado exitosamente',
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al eliminar producto: ${e.message}`,
      });
    }
  }
}
