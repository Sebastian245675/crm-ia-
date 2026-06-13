import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';

const CONFIG_PATH = 'c:/Users/USUARIO/Downloads/PROYECTO_IA/agent_config.json';

@Injectable()
export class AgentService {
  private systemInstruction = `Eres un agente de inteligencia artificial avanzado para La de Todos.
Tu objetivo es asistir a los administradores y usuarios en la gestión del negocio a través de WhatsApp.
Tienes acceso a varias herramientas de la base de datos para consultar productos, ventas e historiales de cambios, así como realizar ventas o agregar productos.

REGLAS DE ROBUSTEZ Y NO-ALUCINACIÓN (CRÍTICAS):
1. ¡PROHIBIDO INVENTAR PRODUCTOS O STOCK! Nunca asumas, adivines o inventes la existencia de ningún producto, stock, precio o ID.
2. Para CUALQUIER consulta de productos (por ejemplo: si existe un producto, su stock, su precio, etc.), debes llamar OBLIGATORIAMENTE a 'buscar_producto_por_nombre' o 'listar_todos_los_productos'.
3. Si la base de datos (las herramientas) no devuelve ningún producto o el producto consultado no está en la respuesta de la herramienta, debes responder de forma explícita y honesta que no existe en el inventario. No inventes que tienes stock o que cuesta cierta cantidad.
4. Toda información que presentes sobre productos (nombre exacto, ID, stock, precio) debe coincidir al 100% con los datos retornados por las herramientas. No los modifiques.
5. Para consultas de ventas u operaciones de caja, llama obligatoriamente a 'ver_ventas_recientes'. No inventes transacciones ni ganancias ficticias.
6. Si el usuario te pide registrar una venta y el producto no tiene suficiente stock según la herramienta, rechaza la operación informando el stock real disponible.
7. Responde siempre de manera profesional, clara y amigable en español usando emojis 🛠️📦💵. Presenta listas legibles.`;

  private declaracionesHerramientas = [
    {
      name: 'listar_todos_los_productos',
      description: 'Obtiene la lista completa de todos los productos en stock, incluyendo su ID, precio, cantidad en inventario y si está activo.',
    },
    {
      name: 'buscar_producto_por_nombre',
      description: 'Busca productos específicos por coincidencia parcial de su nombre.',
      parameters: {
        type: 'OBJECT',
        properties: {
          nombre: {
            type: 'STRING',
            description: 'El nombre o término de búsqueda del producto.',
          },
        },
        required: ['nombre'],
      },
    },
    {
      name: 'ver_ventas_recientes',
      description: 'Muestra el historial de ventas registradas en la tienda.',
      parameters: {
        type: 'OBJECT',
        properties: {
          limite: {
            type: 'INTEGER',
            description: 'Número máximo de ventas recientes a recuperar. Por defecto es 10.',
          },
        },
      },
    },
    {
      name: 'ver_historial_modificaciones',
      description: 'Muestra las modificaciones de productos registradas por los usuarios de la plataforma.',
      parameters: {
        type: 'OBJECT',
        properties: {
          limite: {
            type: 'INTEGER',
            description: 'Número máximo de registros a recuperar. Por defecto es 10.',
          },
        },
      },
    },
    {
      name: 'registrar_venta',
      description: 'Procesa y guarda una venta en la base de datos actualizando el stock disponible.',
      parameters: {
        type: 'OBJECT',
        properties: {
          producto_id: {
            type: 'INTEGER',
            description: 'El ID único del producto a vender.',
          },
          cantidad: {
            type: 'NUMBER',
            description: 'Cantidad de unidades a vender.',
          },
          dinero_recibido: {
            type: 'NUMBER',
            description: 'Dinero en efectivo recibido para pagar la compra.',
          },
        },
        required: ['producto_id', 'cantidad', 'dinero_recibido'],
      },
    },
    {
      name: 'registrar_producto',
      description: 'Crea y registra un nuevo producto en el catálogo.',
      parameters: {
        type: 'OBJECT',
        properties: {
          nombre: {
            type: 'STRING',
            description: 'Nombre del producto (ej. Martillo, Alicate).',
          },
          precio: {
            type: 'NUMBER',
            description: 'Precio unitario en dólares.',
          },
          stock: {
            type: 'NUMBER',
            description: 'Cantidad inicial disponible.',
          },
        },
        required: ['nombre', 'precio', 'stock'],
      },
    },
    {
      name: 'modificar_producto',
      description: 'Modifica los detalles (nombre, precio o stock) de un producto existente.',
      parameters: {
        type: 'OBJECT',
        properties: {
          producto_id: {
            type: 'INTEGER',
            description: 'ID del producto a modificar.',
          },
          nombre: {
            type: 'STRING',
            description: 'Nuevo nombre para el producto.',
          },
          precio: {
            type: 'NUMBER',
            description: 'Nuevo precio del producto.',
          },
          stock: {
            type: 'NUMBER',
            description: 'Nueva cantidad disponible en stock.',
          },
        },
        required: ['producto_id', 'nombre', 'precio', 'stock'],
      },
    },
  ];

  constructor(private readonly db: DatabaseService) {}

  cargarApiKey(): string {
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        return config.gemini_key || '';
      } catch (e) {}
    }
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  async ejecutarHerramienta(nombreFuncion: string, args: any): Promise<any> {
    try {
      if (nombreFuncion === 'listar_todos_los_productos') {
        const rows = await this.db.query(
          'SELECT id, nombre, precio, stock, fecha_creacion, activo FROM productos ORDER BY id'
        );
        return {
          db: 'Database',
          data: rows.map((r) => ({
            id: r.id,
            nombre: r.nombre,
            precio: parseFloat(r.precio),
            stock: parseFloat(r.stock),
            fecha_creacion: r.fecha_creacion || '',
            activo: r.activo === true || r.activo === 1,
          })),
        };
      } else if (nombreFuncion === 'buscar_producto_por_nombre') {
        const term = `%${String(args.nombre || '').toLowerCase()}%`;
        const rows = await this.db.query(
          'SELECT id, nombre, precio, stock, fecha_creacion, activo FROM productos WHERE LOWER(nombre) LIKE %s ORDER BY id',
          [term]
        );
        return {
          db: 'Database',
          data: rows.map((r) => ({
            id: r.id,
            nombre: r.nombre,
            precio: parseFloat(r.precio),
            stock: parseFloat(r.stock),
            fecha_creacion: r.fecha_creacion || '',
            activo: r.activo === true || r.activo === 1,
          })),
        };
      } else if (nombreFuncion === 'ver_ventas_recientes') {
        const limit = Number(args.limite || 10);
        const rows = await this.db.query(
          'SELECT v.id, v.producto_id, p.nombre as nombre_producto, v.cantidad, v.total, v.fecha FROM ventas v LEFT JOIN productos p ON v.producto_id = p.id ORDER BY v.fecha DESC LIMIT %s',
          [limit]
        );
        return {
          db: 'Database',
          data: rows.map((r) => ({
            id: r.id,
            producto_id: r.producto_id,
            nombre_producto: r.nombre_producto || 'Producto Eliminado',
            cantidad: parseFloat(r.cantidad),
            total: parseFloat(r.total),
            fecha: r.fecha || '',
          })),
        };
      } else if (nombreFuncion === 'ver_historial_modificaciones') {
        const limit = Number(args.limite || 10);
        const rows = await this.db.query(
          'SELECT h.producto_id, p.nombre as nombre_producto, h.usuario_correo, h.fecha FROM historial_modificaciones h LEFT JOIN productos p ON h.producto_id = p.id ORDER BY h.id DESC LIMIT %s',
          [limit]
        );
        return {
          db: 'Database',
          data: rows.map((r) => ({
            producto_id: r.producto_id,
            nombre_producto: r.nombre_producto || 'Producto Desconocido',
            usuario_correo: r.usuario_correo,
            fecha: r.fecha || 'Reciente',
          })),
        };
      } else if (nombreFuncion === 'registrar_venta') {
        const prodId = parseInt(args.producto_id);
        const cantidad = parseFloat(args.cantidad);
        const dineroRecibido = parseFloat(args.dinero_recibido);

        const rows = await this.db.query(
          'SELECT nombre, precio, stock, activo FROM productos WHERE id = %s',
          [prodId]
        );

        if (rows.length === 0) {
          return { success: false, error: `Producto con ID ${prodId} no encontrado.` };
        }

        const prod = rows[0];
        const isActivo = prod.activo === true || prod.activo === 1;
        if (!isActivo) {
          return { success: false, error: `El producto '${prod.nombre}' está inactivo.` };
        }

        const stockActual = parseFloat(prod.stock);
        if (stockActual < cantidad) {
          return {
            success: false,
            error: `Stock insuficiente. Stock actual: ${stockActual}, solicitado: ${cantidad}`,
          };
        }

        const total = parseFloat(prod.precio) * cantidad;
        if (dineroRecibido < total) {
          return {
            success: false,
            error: `Dinero recibido ($${dineroRecibido}) es menor al total a pagar ($${total}).`,
          };
        }

        const cambio = dineroRecibido - total;
        const nuevoStock = stockActual - cantidad;

        await this.db.query('UPDATE productos SET stock = %s WHERE id = %s', [nuevoStock, prodId]);
        const insertRes = await this.db.query(
          'INSERT INTO ventas (producto_id, cantidad, total, fecha) VALUES (%s, %s, %s, NOW()) RETURNING id',
          [prodId, cantidad, total]
        );

        return {
          success: true,
          db: 'Database',
          mensaje: `Venta registrada con éxito. Producto: '${prod.nombre}' x ${cantidad} unidades. Total: $${total.toFixed(2)}. Cambio: $${cambio.toFixed(2)}`,
          venta_id: insertRes[0]?.id || null,
          total,
          cambio,
        };
      } else if (nombreFuncion === 'registrar_producto') {
        const nombre = args.nombre;
        const precio = parseFloat(args.precio);
        const stock = parseFloat(args.stock);

        const insertRes = await this.db.query(
          'INSERT INTO productos (nombre, precio, stock, fecha_creacion, activo) VALUES (%s, %s, %s, NOW(), TRUE) RETURNING id',
          [nombre, precio, stock]
        );
        const newId = insertRes[0]?.id || null;

        if (newId) {
          await this.db.query(
            'INSERT INTO historial_modificaciones (producto_id, usuario_correo) VALUES (%s, %s)',
            [newId, 'bot_whatsapp@ferreteria.com']
          );
        }

        return {
          success: true,
          db: 'Database',
          mensaje: `Producto '${nombre}' registrado exitosamente con ID ${newId}.`,
          producto_id: newId,
        };
      } else if (nombreFuncion === 'modificar_producto') {
        const prodId = parseInt(args.producto_id);
        const nombre = args.nombre;
        const precio = parseFloat(args.precio);
        const stock = parseFloat(args.stock);

        await this.db.query(
          'UPDATE productos SET nombre = %s, precio = %s, stock = %s WHERE id = %s',
          [nombre, precio, stock, prodId]
        );
        await this.db.query(
          'INSERT INTO historial_modificaciones (producto_id, usuario_correo) VALUES (%s, %s)',
          [prodId, 'bot_whatsapp@ferreteria.com']
        );

        return {
          success: true,
          db: 'Database',
          mensaje: `Producto #${prodId} modificado correctamente en la base de datos.`,
        };
      } else {
        return { error: `Función '${nombreFuncion}' no soportada.` };
      }
    } catch (e) {
      return { error: `Error al ejecutar la herramienta: ${e.message}` };
    }
  }

  async obtenerContextoBaseConocimiento(): Promise<string> {
    try {
      const rows = await this.db.query(
        "SELECT datos FROM documentos WHERE tabla_nombre = 'knowledge_bases'"
      );
      
      let contextoTotal = '';
      
      const kbs = rows
        .map((row) => {
          try {
            return JSON.parse(row.datos);
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);
      
      for (const kb of kbs) {
        if (kb.documents && kb.documents.length > 0) {
          contextoTotal += `\n=== BASE DE CONOCIMIENTO: ${kb.name} ===\n`;
          contextoTotal += `Descripción: ${kb.description || 'Sin descripción'}\n`;
          for (const doc of kb.documents) {
            if (doc.content) {
              contextoTotal += `--- Documento: ${doc.name} ---\n`;
              contextoTotal += `${doc.content}\n`;
            }
          }
        }
      }
      
      return contextoTotal;
    } catch (e) {
      console.error('Error al obtener contexto de base de conocimiento:', e);
      return '';
    }
  }

  async procesarMensaje(
    mensaje: string,
    remitente: string
  ): Promise<{ response: string; thoughts: string[] }> {
    const apiConfigKey = this.cargarApiKey();
    const thoughts: string[] = [];

    if (!apiConfigKey) {
      thoughts.push('🔑 [Configuración] GEMINI_API_KEY no detectada. Iniciando en Modo Reglas (Offline).');
      const resText = await this.procesarPorReglas(mensaje, thoughts);
      return {
        response: `${resText}\n\n⚠️ _[Modo Simulado Activo: Configura la API Key de Gemini en el Panel Web para respuestas avanzadas con IA]_`,
        thoughts,
      };
    }

    thoughts.push('🔑 [Configuración] API Key de Gemini detectada. Iniciando flujo cognitivo de Agente...');

    const kbContext = await this.obtenerContextoBaseConocimiento();
    let currentSystemInstruction = this.systemInstruction;
    if (kbContext.trim()) {
      currentSystemInstruction += `\n\nINFORMACIÓN ADICIONAL DE LA BASE DE CONOCIMIENTO (Usa estos datos reales del negocio para responder consultas específicas):\n${kbContext}`;
      thoughts.push('📚 [Base de Conocimiento] Información cargada del negocio e inyectada en el prompt.');
    } else {
      thoughts.push('📚 [Base de Conocimiento] No se encontró información adicional en la base de conocimientos.');
    }

    const historial: any[] = [
      {
        role: 'user',
        parts: [{ text: mensaje }],
      },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiConfigKey}`;
    const toolsPayload = [{ functionDeclarations: this.declaracionesHerramientas }];

    const maxLoops = 5;
    let currentLoop = 0;

    while (currentLoop < maxLoops) {
      currentLoop++;
      const payload = {
        contents: historial,
        tools: toolsPayload,
        systemInstruction: {
          parts: [{ text: currentSystemInstruction }],
        },
      };

      try {
        thoughts.push(`🧠 [Pensamiento] Consultando Gemini (Paso ${currentLoop})...`);
        const res = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        });

        if (res.status !== 200) {
          thoughts.push(`❌ [Error API] Gemini retornó código de estado ${res.status}: ${JSON.stringify(res.data)}`);
          throw new Error('Error en la respuesta de Gemini API.');
        }

        const resJson = res.data;
        const candidate = resJson.candidates?.[0] || {};
        const content = candidate.content || {};
        const parts = content.parts || [];

        if (parts.length === 0) {
          thoughts.push('⚠️ [Alerta] Gemini devolvió una respuesta vacía.');
          break;
        }

        const part = parts[0];

        if (part.functionCall) {
          const fnCall = part.functionCall;
          const fnName = fnCall.name;
          const fnArgs = fnCall.args || {};

          thoughts.push(
            `🔧 [Herramienta] Gemini solicita ejecutar: \`${fnName}\` con argumentos: ${JSON.stringify(fnArgs)}`
          );

          const resultadoEjecucion = await this.ejecutarHerramienta(fnName, fnArgs);
          thoughts.push(
            `📊 [Base de Datos] Resultado obtenido: ${JSON.stringify(resultadoEjecucion.data || resultadoEjecucion).substring(0, 200)}...`
          );

          historial.push({
            role: 'model',
            parts: [{ functionCall: { name: fnName, args: fnArgs } }],
          });

          historial.push({
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: fnName,
                  response: { name: fnName, content: resultadoEjecucion },
                },
              },
            ],
          });
        } else if (part.text) {
          const textoFinal = part.text;
          thoughts.push('💬 [Decisión] Gemini ha generado la respuesta final.');
          return { response: textoFinal, thoughts };
        } else {
          break;
        }
      } catch (e) {
        thoughts.push(`💥 [Excepción] Ocurrió un error en el flujo de IA: ${e.message}`);
        thoughts.push('🔄 [Recuperación] Entrando a Modo Reglas debido a un error de conexión con el servidor de IA.');
        const rulesText = await this.procesarPorReglas(mensaje, thoughts);
        return {
          response: `${rulesText}\n\n⚠️ _[Nota: Respuesta generada localmente por fallo en API de IA]_`,
          thoughts,
        };
      }
    }

    thoughts.push('⏰ [Alerta] Se excedió el límite de iteraciones en el razonamiento del agente.');
    return {
      response: 'Disculpa, he tenido problemas para estructurar mi respuesta. ¿Podrías ser más específico con tu consulta? 🛠️',
      thoughts,
    };
  }

  private async procesarPorReglas(mensaje: string, thoughts: string[]): Promise<string> {
    const msg = mensaje.toLowerCase().trim();

    // 1. Saludos
    if (/\b(hola|buenos dias|buenas tardes|buenas noches|buen dia|que tal|oe|holaa)\b/.test(msg)) {
      thoughts.push('📝 [Regla] Coincidencia con saludo.');
      return (
        '👋 ¡Hola! Bienvenido al asistente de La de Todos.\n' +
        'Estoy a tu servicio. Puedo ayudarte con las siguientes consultas:\n\n' +
        '📦 *Productos*: Ver catálogo completo o buscar por nombre.\n' +
        '📈 *Ventas*: Ver el historial de ventas recientes.\n' +
        '📜 *Historial*: Consultar las modificaciones hechas a los productos.\n' +
        '💵 *Caja*: Consultar un resumen de stock y ventas de hoy.'
      );
    }

    // 2. Listar productos
    if (msg.includes('productos') || msg.includes('catalogo') || msg.includes('inventario') || msg === 'ver stock') {
      thoughts.push('📝 [Regla] Coincidencia con listar todos los productos.');
      const res = await this.ejecutarHerramienta('listar_todos_los_productos', {});
      const prods = res.data || [];

      if (prods.length === 0) {
        return '📦 No hay productos registrados en el inventario actual.';
      }

      let texto = '📦 *Catálogo de Productos:*\n\n';
      for (const p of prods) {
        const estado = p.activo ? '✅ Activo' : '❌ Inactivo';
        texto += `• *ID ${p.id}*: ${p.nombre} | Precio: $${Number(p.precio).toFixed(2)} | Stock: ${p.stock} unidades | (${estado})\n`;
      }
      return texto;
    }

    // 3. Buscar productos
    const matchBuscar = mensaje.match(/buscar\s+(.+)/i) || mensaje.match(/consulta\s+(.+)/i);
    if (matchBuscar) {
      const termino = matchBuscar[1].trim();
      thoughts.push(`📝 [Regla] Coincidencia con buscar producto: '${termino}'`);
      const res = await this.ejecutarHerramienta('buscar_producto_por_nombre', { nombre: termino });
      const prods = res.data || [];

      if (prods.length === 0) {
        return `🔍 No se encontraron productos que coincidan con '${termino}'.`;
      }

      let texto = `🔍 *Resultados de búsqueda para '${termino}':*\n\n`;
      for (const p of prods) {
        const estado = p.activo ? 'Activo' : 'Inactivo';
        texto += `• *ID ${p.id}*: ${p.nombre} | Precio: $${Number(p.precio).toFixed(2)} | Stock: ${p.stock} u. (${estado})\n`;
      }
      return texto;
    }

    // 4. Historial de ventas
    if (msg.includes('ventas') || msg.includes('historial de venta')) {
      thoughts.push('📝 [Regla] Coincidencia con ver ventas.');
      const res = await this.ejecutarHerramienta('ver_ventas_recientes', { limite: 10 });
      const vts = res.data || [];

      if (vts.length === 0) {
        return '📈 No se registran ventas realizadas en el sistema.';
      }

      let texto = '📈 *Historial de Ventas Recientes:*\n\n';
      let totalRecaudado = 0;
      for (const v of vts) {
        texto += `• [${v.fecha}] Venta #${v.id}: ${v.nombre_producto} | Cantidad: ${v.cantidad} | Total: $${Number(v.total).toFixed(2)}\n`;
        totalRecaudado += Number(v.total);
      }
      texto += `\n💰 *Total acumulado (últimas 10):* $${totalRecaudado.toFixed(2)}`;
      return texto;
    }

    // 5. Historial de modificaciones
    if (msg.includes('historial') || msg.includes('modificaciones') || msg.includes('cambios')) {
      thoughts.push('📝 [Regla] Coincidencia con ver modificaciones.');
      const res = await this.ejecutarHerramienta('ver_historial_modificaciones', { limite: 10 });
      const mods = res.data || [];

      if (mods.length === 0) {
        return '📜 No hay registros de modificaciones de productos en el historial.';
      }

      let texto = '📜 *Historial de Modificaciones:*\n\n';
      for (const m of mods) {
        texto += `• Producto ID ${m.producto_id} (${m.nombre_producto}) modificado por: \`${m.usuario_correo}\` | [${m.fecha}]\n`;
      }
      return texto;
    }

    // 6. Resumen de caja
    if (msg.includes('caja') || msg.includes('resumen') || msg.includes('estadisticas') || msg.includes('dinero')) {
      thoughts.push('📝 [Regla] Coincidencia con resumen de caja.');
      const resP = await this.ejecutarHerramienta('listar_todos_los_productos', {});
      const resV = await this.ejecutarHerramienta('ver_ventas_recientes', { limite: 1000 });

      const prods = resP.data || [];
      const vts = resV.data || [];

      const totalItems = prods.length;
      const stockTotal = prods.reduce((acc, p) => acc + Number(p.stock), 0);
      const dineroVentas = vts.reduce((acc, v) => acc + Number(v.total), 0);

      return (
        '📊 *Resumen General de la Ferretería:*\n\n' +
        `🛠️ *Total de Productos en Catálogo:* ${totalItems} items\n` +
        `📦 *Inventario Total en Existencia:* ${stockTotal.toFixed(1)} unidades\n` +
        `💵 *Ingresos Totales por Ventas:* $${dineroVentas.toFixed(2)}\n` +
        `📈 *Cantidad de Ventas Registradas:* ${vts.length}`
      );
    }

    // 7. Registrar producto por reglas
    const matchReg = msg.match(/registrar\s+producto\s+(.+?),\s*precio\s+([\d.]+),\s*stock\s+([\d.]+)/i);
    if (matchReg) {
      const nombre = matchReg[1].trim();
      const precio = parseFloat(matchReg[2]);
      const stock = parseFloat(matchReg[3]);
      thoughts.push(`📝 [Regla] Coincidencia con registrar nuevo producto: '${nombre}'`);

      const res = await this.ejecutarHerramienta('registrar_producto', { nombre, precio, stock });
      if (res.success) {
        return `✅ ${res.mensaje}`;
      } else {
        return `❌ Error al registrar producto: ${res.error}`;
      }
    }

    // 8. Búsqueda en la Base de Conocimiento (Fallback offline)
    const kbContext = await this.obtenerContextoBaseConocimiento();
    if (kbContext.trim()) {
      // Buscar coincidencias sencillas por palabras clave
      const secciones = kbContext.split('--- Documento:');
      for (const seccion of secciones) {
        if (!seccion.trim()) continue;
        const lineas = seccion.split('\n');
        const tituloDoc = lineas[0].replace('---', '').trim();
        const contenidoDoc = lineas.slice(1).join('\n').trim();

        // Buscar palabras relevantes del mensaje (más de 3 letras)
        const palabrasMensaje = msg.split(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]+/).filter(w => w.length > 3);
        let coincidencias = 0;
        for (const pal of palabrasMensaje) {
          if (contenidoDoc.toLowerCase().includes(pal) || tituloDoc.toLowerCase().includes(pal)) {
            coincidencias++;
          }
        }

        // Si hay coincidencia de al menos un término clave significativo
        if (coincidencias > 0 && palabrasMensaje.length > 0) {
          thoughts.push(`📝 [Regla] Coincidencia offline con documento de base de conocimiento: '${tituloDoc}'`);
          return `📖 *Información encontrada en la Base de Conocimientos (${tituloDoc}):*\n\n${contenidoDoc}`;
        }
      }
    }

    // 9. Mensaje no reconocido (si no hay coincidencia en KB)
    thoughts.push('📝 [Regla] Mensaje no reconocido y sin coincidencia en KB, enviar menú de ayuda.');
    return (
      '🛠️ Lo siento, no he comprendido tu instrucción. Puedes intentar con:\n\n' +
      '• *"hola"*\n' +
      '• *"ver stock"*\n' +
      '• *"buscar martillo"*\n' +
      '• *"registrar producto Destornillador, precio 4.5, stock 20"*\n' +
      '• *"ventas"*\n' +
      '• *"historial"*\n' +
      '• *"resumen de caja"'
    );
  }
}
