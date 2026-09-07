import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as express from 'express';
import { DatabaseService } from '../database/database.service';

type PublicFormField = {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'tel';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  section?: string;
};

type StoredForm = {
  id: string;
  title: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
  fields?: PublicFormField[];
  owner_id?: string;
  website_id?: string;
  published?: boolean;
};

@Controller('api/public/forms')
export class PublicFormsController {
  constructor(private readonly db: DatabaseService) {}

  private async findForm(formId: string): Promise<StoredForm> {
    const rows = await this.db.query(
      "SELECT datos FROM documentos WHERE tabla_nombre = 'website_forms' AND id = %s LIMIT 1",
      [formId],
    );
    if (!rows.length) throw new NotFoundException('El formulario no existe o ya no está disponible');

    let form: StoredForm;
    try {
      form = JSON.parse(rows[0].datos);
    } catch (_) {
      throw new NotFoundException('El formulario no está disponible');
    }
    if (form.published === false) throw new NotFoundException('El formulario no está publicado');
    return form;
  }

  @Get(':formId')
  async getForm(@Param('formId') formId: string) {
    const form = await this.findForm(formId);
    const profileRows = await this.db.query(
      "SELECT datos FROM documentos WHERE tabla_nombre = 'company_profile'",
    );
    const profiles = profileRows.flatMap((row) => {
      try { return [JSON.parse(row.datos)]; } catch (_) { return []; }
    });
    const userRows = form.owner_id
      ? await this.db.query('SELECT nombre, correo FROM usuarios WHERE id = %s LIMIT 1', [String(form.owner_id)])
      : [];
    const owner = userRows[0] || {};
    const profile = profiles.find((item) =>
      String(item.owner_id || item.user_id || '') === String(form.owner_id || ''),
    ) || profiles.find((item) =>
      owner.correo && String(item.updated_by || '').toLowerCase() === String(owner.correo).toLowerCase(),
    ) || {};
    const resolvedBrandName = profile.friendly_name || profile.legal_name || owner.nombre || 'Websy';

    return {
      form: {
        id: form.id,
        title: form.title,
        description: form.description || '',
        buttonText: form.buttonText || 'Enviar respuestas',
        successMessage: form.successMessage || 'Recibimos tus respuestas correctamente.',
        fields: Array.isArray(form.fields) ? form.fields : [],
      },
      branding: {
        name: /^websy$/i.test(String(resolvedBrandName).trim()) ? 'WEBSY' : resolvedBrandName,
        logo: profile.logo || '',
      },
    };
  }

  @Post(':formId/submissions')
  async submitForm(
    @Param('formId') formId: string,
    @Body() body: { formData?: Record<string, unknown>; website?: string },
    @Req() request: express.Request,
  ) {
    const form = await this.findForm(formId);
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const input = body?.formData;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Las respuestas no tienen un formato válido');
    }

    const formData: Record<string, string> = {};
    for (const field of fields) {
      const rawValue = input[field.id];
      const value = typeof rawValue === 'string' ? rawValue.trim().slice(0, 10000) : '';
      if (field.required && !value) {
        throw new BadRequestException(`Falta completar: ${field.label}`);
      }
      if (value) formData[field.id] = value;
    }

    const id = `submission-${randomUUID()}`;
    const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const submission = {
      id,
      formId: form.id,
      formData,
      submittedAt: new Date().toISOString(),
      ip: forwardedFor || request.ip || 'web',
      status: 'new',
      owner_id: form.owner_id,
      website_id: form.website_id,
      source: 'public-form',
    };

    await this.db.query(
      "INSERT INTO documentos (tabla_nombre, id, datos) VALUES ('website_form_submissions', %s, %s)",
      [id, JSON.stringify(submission)],
    );
    return { success: true, submissionId: id, message: form.successMessage };
  }
}
