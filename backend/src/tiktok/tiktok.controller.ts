import { Controller, Post, Body, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgencyPermissionGuard } from '../auth/agency-permission.guard';
import { RequireAgencyPermission } from '../auth/agency-permission.decorator';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('api/tiktok')
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
@RequireAgencyPermission('manageMarketing')
export class TikTokController {
  private uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');

  @Post('token')
  async exchangeToken(@Body() body: any, @Res() res: express.Response) {
    try {
      const { code, client_key, client_secret, redirect_uri } = body;
      if (!code || !client_key || !client_secret || !redirect_uri) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Faltan parámetros requeridos (code, client_key, client_secret, redirect_uri)',
        });
      }

      console.log('[TIKTOK] Intercambiando código de autorización por token...');

      // Construir cuerpo de petición x-www-form-urlencoded para TikTok
      const details: Record<string, string> = {
        client_key,
        client_secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      };

      const formBody = Object.keys(details)
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(details[key]))
        .join('&');

      const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: formBody,
      });

      const data = await response.json();
      if (data.error || data.error_code) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: data.error_description || data.message || 'Error en autenticación con TikTok',
          details: data,
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al intercambiar token: ${e.message}`,
      });
    }
  }

  @Post('publish')
  async publishVideo(@Body() body: any, @Res() res: express.Response) {
    try {
      const { access_token, caption, video_url } = body;
      if (!access_token || !video_url) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Faltan parámetros requeridos (access_token, video_url)',
        });
      }

      console.log('[TIKTOK] Iniciando publicación de video:', video_url);

      // Obtener ruta local del archivo
      let localPath = '';
      if (video_url.startsWith('/uploads/')) {
        const filename = video_url.replace('/uploads/', '');
        localPath = path.join(this.uploadsDir, filename);
      } else if (video_url.startsWith('blob:')) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No se pueden enviar videos blob locales directos. Por favor sube el archivo primero a través del editor.',
        });
      } else {
        // Tratar como preset o URL externa. Descargar localmente temporal
        const filename = `temp_${Date.now()}.mp4`;
        localPath = path.join(this.uploadsDir, filename);
        console.log('[TIKTOK] Descargando video temporal desde URL externa...');
        const fileResponse = await fetch(video_url);
        const buffer = Buffer.from(await fileResponse.arrayBuffer());
        fs.writeFileSync(localPath, buffer);
      }

      if (!fs.existsSync(localPath)) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `Archivo de video no encontrado en la ruta local: ${localPath}`,
        });
      }

      const fileStats = fs.statSync(localPath);
      const fileSize = fileStats.size;
      const fileBuffer = fs.readFileSync(localPath);

      console.log(`[TIKTOK] Archivo cargado localmente. Tamaño: ${fileSize} bytes.`);

      // Paso 1: Inicializar la subida en TikTok API
      const initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
      const initBody = {
        post_info: {
          title: caption || 'Video promocional de Voltium Sanrey',
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: fileSize,
          chunk_size: fileSize,
          total_chunk_count: 1,
        },
      };

      console.log('[TIKTOK] Llamando a endpoint Init de TikTok...');
      const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(initBody),
      });

      const initData = await initResponse.json();
      console.log('[TIKTOK] Respuesta de Init:', JSON.stringify(initData));

      if (initData.error || initData.error_code || !initData.data?.upload_url) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: initData.error_description || initData.message || 'Error al iniciar la subida en TikTok',
          details: initData,
        });
      }

      const { upload_url } = initData.data;

      // Paso 2: Subir los bytes del video al upload_url devuelto por TikTok
      console.log('[TIKTOK] Subiendo bytes del archivo de video a TikTok...');
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
          'Content-Length': String(fileSize),
          'Content-Type': 'video/mp4',
        },
        body: fileBuffer,
      });

      console.log('[TIKTOK] Código de respuesta de subida:', uploadResponse.status);

      if (uploadResponse.status !== 200 && uploadResponse.status !== 201) {
        const uploadErrText = await uploadResponse.text();
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Fallo al subir video a los servidores de almacenamiento de TikTok. Status: ${uploadResponse.status}`,
          details: uploadErrText,
        });
      }

      // Publicado con éxito!
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Video publicado y procesado en TikTok con éxito.',
        publish_id: initData.data.publish_id || `tt_pub_${Date.now()}`,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al publicar en TikTok: ${e.message}`,
      });
    }
  }
}
