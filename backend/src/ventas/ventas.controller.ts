import { Controller, Post, Get, Body, Res, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as express from 'express';

@Controller('api')
export class VentasController {
  constructor(private readonly db: DatabaseService) {}

  @Post('venta')
  async registerVenta(@Body() body: any, @Res() res: express.Response) {
    try {
      const productoId = Number(body.producto_id || body.productoId || body.id);
      const cantidad = Number(body.cantidad || body.qty || body.quantity || 1);
      const recibido = Number(body.recibido || body.total || 0);

      if (!productoId || cantidad <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'producto_id y cantidad válidos son requeridos',
        });
      }

      const rows = await this.db.query(
        'SELECT id, nombre, precio, stock FROM productos WHERE id = %s',
        [productoId]
      );

      if (!rows.length) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Producto no encontrado',
        });
      }

      const producto = rows[0];
      const stockActual = Number(producto.stock || 0);
      if (stockActual < cantidad) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Stock insuficiente. Disponibles: ${stockActual}`,
        });
      }

      const precioUnitario = Number(producto.precio || 0);
      const total = recibido > 0 ? recibido : Number(body.total || precioUnitario * cantidad);
      const nuevoStock = stockActual - cantidad;

      await this.db.query(
        'UPDATE productos SET stock = %s WHERE id = %s',
        [nuevoStock, productoId]
      );

      const ventaInsert = await this.db.query(
        'INSERT INTO ventas (producto_id, cantidad, total, fecha) VALUES (%s, %s, %s, NOW()) RETURNING id',
        [productoId, cantidad, total]
      );

      if (ventaInsert.length > 0) {
        await this.db.query(
          'INSERT INTO historial_modificaciones (producto_id, usuario_correo) VALUES (%s, %s)',
          [productoId, 'venta_automatica@tienda.com']
        );
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        venta_id: ventaInsert[0]?.id || null,
        producto_id: productoId,
        cantidad,
        total,
        stock_actualizado: nuevoStock,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al registrar la venta: ${e.message}`,
      });
    }
  }

  @Get('ventas')
  async getVentas(@Res() res: express.Response) {
    try {
      const rows = await this.db.query(
        'SELECT v.id, v.producto_id, p.nombre as nombre_producto, v.cantidad, v.total, v.fecha FROM ventas v LEFT JOIN productos p ON v.producto_id = p.id ORDER BY v.fecha DESC'
      );
      return res.status(HttpStatus.OK).json({ success: true, ventas: rows });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al obtener ventas: ${e.message}`,
      });
    }
  }
}
