import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createTransport } from 'nodemailer';

type MailConfig = { email: string; password: string; host: string; port: number; secure: boolean };

@Injectable()
export class EmailsService {
  private listCache: { expiresAt: number; emails: any[] } | null = null;
  private bodyCache = new Map<number, { expiresAt: number; email: any }>();

  constructor(private readonly db: DatabaseService) {}

  private async getConfig(): Promise<MailConfig | null> {
    const rows = await this.db.query("SELECT datos FROM documentos WHERE tabla_nombre = 'mail_config' AND id = 'default_mail'");
    if (!rows.length) return null;
    let config: any;
    try { config = JSON.parse(rows[0].datos); } catch { throw new InternalServerErrorException('La configuración de correo no es válida.'); }
    if (!config?.email || !config?.password) return null;
    const port = Number.parseInt(config.imap_port || config.imapPort || '993', 10);
    return { email: config.email, password: config.password, host: config.imap_host || config.imapHost || 'imap.hostinger.com', port, secure: port === 993 || port === 465 };
  }

  private createClient(config: MailConfig) {
    return new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.email, pass: config.password },
      logger: false,
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 10000,
    });
  }

  async sendSecurityCode(recipient: string, code: string) {
    const rows = await this.db.query("SELECT datos FROM documentos WHERE tabla_nombre = 'mail_config' AND id = 'default_mail'");
    if (!rows.length) throw new Error('No hay una cuenta de correo saliente configurada.');

    let config: any;
    try {
      config = JSON.parse(rows[0].datos);
    } catch {
      throw new Error('La configuración de correo saliente no es válida.');
    }

    if (!config?.email || !config?.password) {
      throw new Error('Completa el correo y la contraseña en la configuración de correo.');
    }

    const port = Number.parseInt(config.smtp_port || config.smtpPort || '465', 10);
    const transport = createTransport({
      host: config.smtp_host || config.smtpHost || 'smtp.hostinger.com',
      port,
      secure: port === 465,
      auth: { user: config.email, pass: config.password },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });

    await transport.sendMail({
      from: `MERCO <${config.email}>`,
      to: recipient,
      subject: 'Código de verificación de MERCO',
      text: `Tu código de verificación es ${code}. Vence en 10 minutos. Si no solicitaste este código, ignora este mensaje.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
          <h2 style="font-size:20px;margin:0 0 16px">Código de verificación</h2>
          <p style="font-size:14px;line-height:1.6;color:#475569">Usa este código para continuar con el acceso a tu cuenta MERCO:</p>
          <div style="font-size:30px;font-weight:700;letter-spacing:8px;padding:18px 20px;margin:20px 0;background:#f8fafc;border:1px solid #cbd5e1;text-align:center">${code}</div>
          <p style="font-size:13px;line-height:1.6;color:#64748b">El código vence en 10 minutos. Si no solicitaste esta verificación, puedes ignorar el mensaje.</p>
        </div>`,
    });
  }

  async fetchEmails(force = false) {
    if (!force && this.listCache && this.listCache.expiresAt > Date.now()) return { success: true, emails: this.listCache.emails, cached: true };
    const config = await this.getConfig();
    if (!config) return { success: false, message: 'No hay una cuenta de correo configurada.' };
    const client = this.createClient(config);
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const count = client.mailbox && client.mailbox.exists ? client.mailbox.exists : 0;
        const emails: any[] = [];
        if (count > 0) {
          const start = Math.max(1, count - 29);
          for await (const message of client.fetch(`${start}:${count}`, { uid: true, envelope: true, flags: true })) {
            const from = message.envelope?.from?.[0];
            const address = from?.address || '';
            emails.push({
              id: `imap-${message.uid}`,
              uid: message.uid,
              fromName: from?.name || address.split('@')[0] || 'Remitente',
              fromEmail: address,
              subject: message.envelope?.subject || '(Sin asunto)',
              date: (message.envelope?.date || new Date()).toISOString(),
              unread: !message.flags?.has('\\Seen'),
              bodyLoaded: false,
            });
          }
        }
        emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.listCache = { expiresAt: Date.now() + 60_000, emails };
        return { success: true, emails, cached: false };
      } finally { lock.release(); }
    } catch (error: any) {
      console.error('[EmailsService] Error IMAP:', error.message);
      return { success: false, message: `No se pudo consultar el correo: ${error.message}` };
    } finally {
      try { await client.logout(); } catch { /* conexión ya cerrada */ }
    }
  }

  async fetchEmail(uid: number) {
    if (!Number.isInteger(uid) || uid <= 0) return { success: false, message: 'Identificador de correo inválido.' };
    const cached = this.bodyCache.get(uid);
    if (cached && cached.expiresAt > Date.now()) return { success: true, email: cached.email, cached: true };
    const config = await this.getConfig();
    if (!config) return { success: false, message: 'No hay una cuenta de correo configurada.' };
    const client = this.createClient(config);
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const message = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        if (!message || !message.source) return { success: false, message: 'El correo ya no está disponible.' };
        const parsed: any = await simpleParser(message.source);
        const email = { uid, body: parsed.text || '(Mensaje sin contenido de texto)', html: parsed.html || '', bodyLoaded: true };
        this.bodyCache.set(uid, { expiresAt: Date.now() + 5 * 60_000, email });
        return { success: true, email, cached: false };
      } finally { lock.release(); }
    } catch (error: any) {
      console.error(`[EmailsService] Error leyendo UID ${uid}:`, error.message);
      return { success: false, message: `No se pudo abrir el correo: ${error.message}` };
    } finally {
      try { await client.logout(); } catch { /* conexión ya cerrada */ }
    }
  }
}
