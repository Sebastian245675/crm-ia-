const { NodeSSH } = require('node-ssh');
const { randomBytes, scryptSync } = require('crypto');

const sshPassword = process.env.SSH_PASSWORD;
const agencyPassword = process.env.AGENCY_PASSWORD;
if (!sshPassword || !agencyPassword) {
  throw new Error('SSH_PASSWORD and AGENCY_PASSWORD are required.');
}

const email = 'juansalazat100@gmail.com';
const websiteId = 'websy-multiservicios';
const formId = 'websy-cuestionario-multiservicios-2026';
const sqlLiteral = (value) => String(value).replace(/'/g, "''");
const salt = randomBytes(16).toString('hex');
const passwordHash = `scrypt$${salt}$${scryptSync(agencyPassword, salt, 64).toString('hex')}`;

const mailQuestions = [
  '¿Cuántas personas usan un mail de la empresa hoy? Decinos el nombre de cada una y qué mail usa.',
  '¿Con qué programa revisan el mail hoy? (Outlook, Gmail, el navegador, etc.)',
  'La página web y el mail de la empresa, ¿con qué empresa los tienen contratados hoy? (el lugar donde pagan el hosting o el dominio)',
  '¿Quién tiene el usuario y la contraseña para entrar a administrar eso? (no hace falta pasárnoslo todavía, solo decirnos quién lo tiene)',
  '¿Van a seguir con el mismo nombre de dominio (lo de después de la @) o quieren cambiarlo?',
  'Además de los mails, ¿usan también agenda, calendario o contactos guardados ahí que no quieran perder?',
  '¿Hay algún horario (una tarde, una noche) en que la empresa pueda estar sin mail un rato para hacer el cambio tranquilos?',
  '¿Quién de la empresa es la persona de contacto para este tema, por si necesitamos algo puntual?',
  '¿Tienen pensado seguir usando lo mismo de siempre, o les gustaría pasarse a otra cosa (por ejemplo, Gmail para empresas)?',
  '¿Hay algo puntual que les preocupe de este cambio? (por ejemplo, perder mails viejos, que se corte el servicio, etc.)',
];
const appQuestions = [
  '¿Para qué quieren la aplicación? Contanos con sus palabras qué problema resuelve.',
  '¿Quién la va a usar: la gente de la empresa, sus clientes, o los dos?',
  'Más o menos, ¿cuántas personas la usarían?',
  '¿Qué les gustaría que haga? (por ejemplo: anotar datos, hacer cotizaciones, mandar avisos, cobrar online)',
  '¿La quieren para usar desde la computadora, desde el celular, o ambos?',
  '¿Para cuándo les gustaría tenerla lista?',
  'Una vez lista, ¿qué esperan de nosotros? (por ejemplo: arreglar algún error, sumar cosas nuevas más adelante, ayudarlos si tienen dudas)',
];
const fields = (questions, prefix, section) => questions.map((label, index) => ({
  id: `${prefix}-${index + 1}`,
  type: 'textarea',
  label: `${index + 1}. ${label}`,
  placeholder: 'Escribí tu respuesta…',
  required: false,
  section,
}));

async function run() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: sshPassword, readyTimeout: 20000 });
    const containerResult = await ssh.execCommand('docker ps --filter "name=postgres" --format "{{.Names}}"');
    const container = containerResult.stdout.trim().split('\n')[0];
    if (!container) throw new Error('PostgreSQL container not found.');

    const query = async (sql) => {
      const encoded = Buffer.from(sql, 'utf8').toString('base64');
      const command = `echo ${encoded} | base64 -d | docker exec -i ${container} psql -U posgrest -d tienda -t -A`;
      const result = await ssh.execCommand(command);
      if (result.code !== 0) throw new Error(result.stderr || 'Database command failed.');
      return result.stdout.trim();
    };

    const userOutput = await query(`
      UPDATE usuarios
      SET nombre = 'Websy', contraseña = '${sqlLiteral(passwordHash)}', account_role = 'agency_owner',
          sub_cuenta = NULL, liberta = 'si', active = TRUE, updated_at = NOW()
      WHERE correo = '${email}'
      RETURNING id;
    `);
    const userId = userOutput.split(/\r?\n/).map((line) => line.trim()).find((line) => /^[a-zA-Z0-9-]+$/.test(line) && line !== 'UPDATE');
    if (!userId || userId.startsWith('UPDATE')) throw new Error(`Account ${email} was not found.`);

    await query(`
      UPDATE suscripciones SET status = 'active', is_demo = FALSE, trial_ends_at = NULL, updated_at = NOW()
      WHERE user_id = '${sqlLiteral(userId)}';
      INSERT INTO suscripciones (user_id, plan, status, is_demo, trial_ends_at)
      SELECT '${sqlLiteral(userId)}', 'deluxe-ilimitado-websy', 'active', FALSE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM suscripciones WHERE user_id = '${sqlLiteral(userId)}');
    `);

    const form = {
      id: formId,
      name: 'Cuestionario para arrancar Multiservicios',
      title: 'WEBSY — Cuestionario para arrancar Multiservicios',
      description: '6 de septiembre de 2026\n\n¡Hola! Para poder arrancar con la copia de seguridad de los mails y con la idea de la aplicación, necesitamos que nos cuenten estos datos. No hace falta que sea técnico ni que esté perfecto: con que nos cuenten lo que saben, alcanza. Pueden responder debajo de cada pregunta o mandarnos las respuestas por WhatsApp o mail.',
      buttonText: 'Enviar respuestas a Websy',
      successMessage: '¡Gracias! Recibimos las respuestas. Agustín, de Websy, se pondrá en contacto si necesita aclarar algún punto.',
      createdAt: '2026-09-06T00:00:00.000Z',
      owner_id: String(userId),
      website_id: websiteId,
      fields: [
        ...fields(mailQuestions, 'mails', '1. Copia de seguridad y pase de los mails'),
        ...fields(appQuestions, 'app', '2. La aplicación que quieren armar'),
      ],
    };
    await query(`
      INSERT INTO documentos (tabla_nombre, id, datos)
      VALUES ('website_forms', '${formId}', '${sqlLiteral(JSON.stringify(form))}')
      ON CONFLICT (tabla_nombre, id) DO UPDATE SET datos = EXCLUDED.datos;
    `);
    console.log(`WEBSY_CONFIGURED user=${userId} form=${formId} fields=${form.fields.length}`);
  } finally {
    ssh.dispose();
  }
}

run().catch((error) => {
  console.error(`WEBSY_CONFIGURATION_FAILED: ${error.message}`);
  process.exitCode = 1;
});
