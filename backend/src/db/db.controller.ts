import { Controller, Get, Post, Param, Body, Res, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as express from 'express';

@Controller('api/db/:table_name')
export class DbController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async select(@Param('table_name') tableName: string, @Res() res: express.Response) {
    try {
      if (!tableName || tableName.includes('/')) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Nombre de tabla inválido',
        });
      }

      const rows = await this.db.query(
        'SELECT datos FROM documentos WHERE tabla_nombre = %s',
        [tableName]
      );

      const data = rows
        .map((row) => {
          try {
            return JSON.parse(row.datos);
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);

      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al obtener datos: ${e.message}`,
      });
    }
  }

  @Post()
  async execute(
    @Param('table_name') tableName: string,
    @Body() body: any,
    @Res() res: express.Response
  ) {
    try {
      if (!tableName || tableName.includes('/')) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Nombre de tabla inválido',
        });
      }

      const { action, id, data } = body;
      if (!action || !id) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'action e id son requeridos',
        });
      }

      let msg = '';

      if (action === 'delete') {
        await this.db.query(
          'DELETE FROM documentos WHERE tabla_nombre = %s AND id = %s',
          [tableName, String(id)]
        );
        msg = 'Documento eliminado';
      } else if (action === 'insert') {
        const datosStr = JSON.stringify(data);
        await this.db.query(
          'INSERT INTO documentos (tabla_nombre, id, datos) VALUES (%s, %s, %s)',
          [tableName, String(id), datosStr]
        );
        msg = 'Documento insertado';
      } else if (action === 'update') {
        const rows = await this.db.query(
          'SELECT datos FROM documentos WHERE tabla_nombre = %s AND id = %s',
          [tableName, String(id)]
        );

        let mergedData = data;
        if (rows.length > 0) {
          try {
            const existing = JSON.parse(rows[0].datos);
            mergedData = { ...existing, ...data };
          } catch (e) {}
        }

        const datosStr = JSON.stringify(mergedData);
        await this.db.query(
          'UPDATE documentos SET datos = %s WHERE tabla_nombre = %s AND id = %s',
          [datosStr, tableName, String(id)]
        );
        msg = 'Documento actualizado';
      } else if (action === 'upsert') {
        const datosStr = JSON.stringify(data);
        const rows = await this.db.query(
          'SELECT id FROM documentos WHERE tabla_nombre = %s AND id = %s',
          [tableName, String(id)]
        );

        if (rows.length > 0) {
          await this.db.query(
            'UPDATE documentos SET datos = %s WHERE tabla_nombre = %s AND id = %s',
            [datosStr, tableName, String(id)]
          );
        } else {
          await this.db.query(
            'INSERT INTO documentos (tabla_nombre, id, datos) VALUES (%s, %s, %s)',
            [tableName, String(id), datosStr]
          );
        }
        msg = 'Documento guardado (upsert)';
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Acción inválida: ${action}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: msg,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al ejecutar acción: ${e.message}`,
      });
    }
  }
}
