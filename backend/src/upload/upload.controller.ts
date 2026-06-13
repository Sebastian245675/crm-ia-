import { Controller, Post, Get, Param, Res, HttpStatus, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class UploadController {
  private uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');

  constructor() {
    // Asegurarse de que el directorio exista
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    console.log('[UPLOAD] Carpeta de uploads:', this.uploadsDir);
  }

  @Post('api/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any, @Res() res: express.Response) {
    try {
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No se envió ningún archivo',
        });
      }

      // Generar nombre de archivo único
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      const randomStr = Math.random().toString(36).substring(2, 10);
      const uniqueFilename = `${Date.now()}_${randomStr}${ext}`;
      const filepath = path.join(this.uploadsDir, uniqueFilename);

      // Guardar el archivo
      fs.writeFileSync(filepath, file.buffer);

      console.log(`[UPLOAD] Archivo guardado: ${filepath} (${file.size} bytes)`);

      const urlPublica = `/uploads/${uniqueFilename}`;
      return res.status(HttpStatus.OK).json({
        success: true,
        url: urlPublica,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al subir archivo: ${e.message}`,
      });
    }
  }

  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: express.Response) {
    const filepath = path.join(this.uploadsDir, filename);
    if (fs.existsSync(filepath)) {
      return res.sendFile(filepath);
    } else {
      return res.status(HttpStatus.NOT_FOUND).send('Not Found');
    }
  }
}
