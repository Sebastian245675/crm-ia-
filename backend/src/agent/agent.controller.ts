import { Controller, Get, Post, Body, Query, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as express from 'express';
import * as fs from 'fs';
import axios from 'axios';

const CONFIG_PATH = 'c:/Users/USUARIO/Downloads/PROYECTO_IA/agent_config.json';

@Controller()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('api/agent/config')
  @UseGuards(JwtAuthGuard)
  getConfig(@Res() res: express.Response) {
    try {
      let config: any = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        } catch (e) {}
      }

      // Enmascarar las llaves antes de enviarlas al frontend
      const maskedConfig = {
        gemini_key: config.gemini_key ? '••••••••••••' : '',
        phone_number_id: config.phone_number_id || config.twilio_sid || '',
        meta_access_token: (config.meta_access_token || config.twilio_token) ? '••••••••••••' : '',
        verify_token: config.verify_token || config.twilio_num || '',
        // Compatibilidad hacia atrás
        twilio_sid: config.twilio_sid || config.phone_number_id || '',
        twilio_token: (config.twilio_token || config.meta_access_token) ? '••••••••••••' : '',
        twilio_num: config.twilio_num || config.verify_token || '',
      };

      return res.status(HttpStatus.OK).json(maskedConfig);
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al obtener configuración: ${e.message}`,
      });
    }
  }

  @Post('api/agent/config')
  @UseGuards(JwtAuthGuard)
  saveConfig(@Body() body: any, @Res() res: express.Response) {
    try {
      let configActual: any = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          configActual = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        } catch (e) {}
      }

      let nuevoGemini = body.gemini_key || '';
      if (nuevoGemini.startsWith('•') || !nuevoGemini) {
        nuevoGemini = configActual.gemini_key || '';
      }

      let nuevoToken = body.meta_access_token || body.twilio_token || '';
      if (nuevoToken.startsWith('•') || !nuevoToken) {
        nuevoToken = configActual.meta_access_token || configActual.twilio_token || '';
      }

      const phoneId = body.phone_number_id || body.twilio_sid || '';
      const vToken = body.verify_token || body.twilio_num || '';

      configActual.gemini_key = nuevoGemini;
      configActual.phone_number_id = phoneId;
      configActual.meta_access_token = nuevoToken;
      configActual.verify_token = vToken;

      // Mantener campos Twilio por compatibilidad
      configActual.twilio_sid = phoneId;
      configActual.twilio_token = nuevoToken;
      configActual.twilio_num = vToken;

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configActual, null, 4), 'utf-8');

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Configuración guardada exitosamente.',
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al guardar configuración: ${e.message}`,
      });
    }
  }

  @Post('api/agent/chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: any, @Res() res: express.Response) {
    try {
      const mensaje = body.message || '';
      const remitente = body.sender || 'Usuario_Simulado';

      const result = await this.agentService.procesarMensaje(mensaje, remitente);

      return res.status(HttpStatus.OK).json({
        success: true,
        response: result.response,
        thoughts: result.thoughts,
      });
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        response: `Error al procesar mensaje en el agente: ${e.message}`,
        thoughts: [`❌ Error interno: ${e.message}`],
      });
    }
  }

  @Get('api/whatsapp')
  verifyWebhook(@Query() query: any, @Res() res: express.Response) {
    try {
      let config: any = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        } catch (e) {}
      }

      const verifyToken = config.verify_token || config.twilio_num || '';
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      if (mode === 'subscribe' && token === verifyToken) {
        return res.status(HttpStatus.OK).send(challenge);
      } else {
        return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
      }
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(e.message);
    }
  }

  @Post('api/whatsapp')
  async whatsappWebhook(@Body() body: any, @Res() res: express.Response) {
    try {
      let mensaje = '';
      let remitente = '';

      // Detectar si el webhook viene de Meta (WhatsApp Cloud API)
      if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const messageObj = body.entry[0].changes[0].value.messages[0];
        mensaje = messageObj.text?.body || '';
        remitente = messageObj.from || '';
      } else {
        mensaje = body.Body || body.message || '';
        remitente = body.From || body.sender || 'whatsapp:+1234567890';
      }

      const result = await this.agentService.procesarMensaje(mensaje, remitente);

      // Si es Meta, responder a la API de Meta y retornar 200
      if (body.object === 'whatsapp_business_account') {
        let config: any = {};
        if (fs.existsSync(CONFIG_PATH)) {
          try {
            config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
          } catch (e) {}
        }
        const phone_number_id = config.phone_number_id || config.twilio_sid || '';
        const meta_access_token = config.meta_access_token || config.twilio_token || '';

        if (phone_number_id && meta_access_token) {
          try {
            await axios.post(
              `https://graph.facebook.com/v19.0/${phone_number_id}/messages`,
              {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: remitente,
                type: 'text',
                text: { body: result.response }
              },
              {
                headers: {
                  Authorization: `Bearer ${meta_access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (axiosError: any) {
            console.error('Error sending message via Meta API:', axiosError.response?.data || axiosError.message);
          }
        }
        return res.status(HttpStatus.OK).json({ success: true });
      }

      // Si es Twilio (o simulador de Twilio), retornar TwiML
      res.header('Content-Type', 'application/xml; charset=utf-8');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${result.response}</Message>
</Response>`;
      return res.status(HttpStatus.OK).send(twiml);
    } catch (e) {
      if (body.object === 'whatsapp_business_account') {
        return res.status(HttpStatus.OK).json({ success: false, error: e.message });
      }
      res.header('Content-Type', 'application/xml; charset=utf-8');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Error al procesar mensaje en el agente de WhatsApp: ${e.message}</Message>
</Response>`;
      return res.status(HttpStatus.OK).send(twiml);
    }
  }
}
