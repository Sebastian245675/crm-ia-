import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FacturacionService {
  private readonly facturamaUrl = 'https://apisandbox.facturama.mx/3/cfdis';
  // Standard basic auth credentials from Java code: sdsmsmds:123456
  private readonly defaultUser = 'sdsmsmds';
  private readonly defaultPass = '123456';

  constructor(private readonly db: DatabaseService) {}

  async timbrarFactura(dto: {
    order_id: string;
    total: number;
    customer_name: string;
    rfc: string;
    zip: string;
    regimen: string;
    uso_cfdi: string;
    forma_pago: string;
    metodo_pago: string;
    billing_line_id?: string;
    items: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
  }) {
    try {
      const now = new Date();
      
      // Formatear fecha y hora local: YYYY-MM-DDTHH:mm:ss
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      // 1. Construir el payload CFDI 4.0 para Facturama
      const payload: any = {
        Currency: 'MXN',
        CfdiType: 'I',
        PaymentForm: dto.forma_pago || '28', // Tarjeta débito/crédito por defecto
        PaymentMethod: dto.metodo_pago || 'PUE',
        ExpeditionPlace: '26015', // Lugar de expedición por defecto
        Exportation: '01',
        Date: formattedDate,
        Receiver: {
          Rfc: dto.rfc || 'XAXX010101000',
          Name: (dto.customer_name || 'PUBLICO EN GENERAL').toUpperCase(),
          CfdiUse: dto.uso_cfdi || 'S01',
          FiscalRegime: dto.regimen || '616',
          TaxZipCode: dto.zip || '26015',
        },
      };

      // Si es RFC genérico, requiere información global
      if (payload.Receiver.Rfc === 'XAXX010101000') {
        payload.GlobalInformation = {
          Periodicity: '01', // Diario
          Months: month,
          Year: year,
        };
      }

      // Convertir items: calcular precio unitario, subtotal e IVA de 16%
      payload.Items = dto.items.map((item) => {
        const itemPriceWithTax = Number(item.price || 0);
        const qty = Number(item.quantity || 1);
        
        const unitPriceNoTax = itemPriceWithTax / 1.16;
        const subtotalNoTax = unitPriceNoTax * qty;
        const taxAmount = subtotalNoTax * 0.16;
        const itemTotal = subtotalNoTax + taxAmount;

        return {
          ProductCode: '01010101', // Código genérico SAT
          Description: item.name,
          Unit: 'Pieza',
          UnitCode: 'H87',
          Quantity: qty,
          UnitPrice: Number(unitPriceNoTax.toFixed(6)),
          Subtotal: Number(subtotalNoTax.toFixed(6)),
          TaxObject: '02', // Sí objeto de impuesto
          Taxes: [
            {
              Name: 'IVA',
              Rate: 0.16,
              Base: Number(subtotalNoTax.toFixed(6)),
              Total: Number(taxAmount.toFixed(6)),
              IsRetention: false,
            },
          ],
          Total: Number(itemTotal.toFixed(6)),
        };
      });

      // 2. Enviar petición HTTP a la API de Sandbox de Facturama
      const authString = Buffer.from(`${this.defaultUser}:${this.defaultPass}`).toString('base64');
      const response = await fetch(this.facturamaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json() as any;

      if (!response.ok) {
        console.error('[Facturama] Error Response:', responseData);
        throw new HttpException(
          responseData.Message || responseData.message || 'Error al timbrar factura en Facturama',
          HttpStatus.BAD_REQUEST
        );
      }

      // 3. Si tiene éxito, guardar en base de datos local
      const uuid = responseData.Uuid || 'N/A';
      const idFacturama = responseData.Id || `id-${Date.now()}`;
      
      await this.db.query(
        'INSERT INTO facturas_electronicas (id, order_id, uuid, fecha, total, estatus, billing_line_id) VALUES (%s, %s, %s, NOW(), %s, %s, %s)',
        [idFacturama, dto.order_id, uuid, dto.total, 'TIMBRADA', dto.billing_line_id || null]
      );

      return {
        success: true,
        uuid,
        id: idFacturama,
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        `Error al emitir factura: ${e.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getHistorial() {
    try {
      const rows = await this.db.query(
        'SELECT id, order_id, uuid, fecha, total, estatus, billing_line_id, agency_id FROM facturas_electronicas ORDER BY fecha DESC'
      );
      return rows;
    } catch (e: any) {
      throw new HttpException(
        `Error al obtener historial: ${e.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
