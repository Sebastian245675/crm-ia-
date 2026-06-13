# Instrucciones para la Descarga de Imágenes

Este proyecto ofrece dos métodos para descargar todas las imágenes de la base de datos:

## Método 1: Usando la Interfaz Web

1. Accede a la aplicación web
2. Ve a la URL `/admin/image-downloader`
3. Usa el botón "Descargar Todas las Imágenes" para iniciar la descarga de imágenes
4. Usa el botón "Exportar Mapeo de URLs" para obtener un archivo JSON con el mapeo de URLs a nombres de archivo

Este método es práctico y rápido para pequeñas cantidades de imágenes, pero puede ser menos confiable para grandes volúmenes debido a las limitaciones del navegador.

## Método 2: Usando el Script de Node.js (Recomendado)

Este método es más confiable para grandes cantidades de imágenes.

### Requisitos previos:
- Node.js instalado
- Acceso a las credenciales de Firebase (archivo serviceAccountKey.json)

### Pasos:

1. **Obtener las credenciales de Firebase:**
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Selecciona tu proyecto
   - Ve a Configuración del proyecto > Cuentas de servicio
   - Haz clic en "Generar nueva clave privada"
   - Guarda el archivo JSON descargado como `serviceAccountKey.json` en la raiz del proyecto

2. **Instalar dependencias:**
   ```bash
   npm install node-fetch@2 firebase-admin
   ```

3. **Ejecutar el script:**
   ```bash
   node scripts/download-images.js
   ```

4. **Resultados:**
   - Las imágenes se descargarán en la carpeta `downloaded_images`
   - Se generará un archivo `url_mapping.json` con el mapeo de URLs a nombres de archivo
   - Las imágenes estarán organizadas en subcarpetas por tipo:
     - `products`: Imágenes de productos
     - `categories`: Imágenes de categorías
     - `testimonials`: Imágenes de testimonios
     - `other`: Otras imágenes

## Después de la Descarga

Una vez que hayas descargado todas las imágenes, puedes:

1. Subir las imágenes a tu nuevo servicio de almacenamiento
2. Actualizar las URLs en tu base de datos con las nuevas ubicaciones
3. Verificar que todas las imágenes se muestren correctamente en la aplicación

## Solución de Problemas

- **Problema:** El navegador bloquea múltiples descargas
  **Solución:** Usa el script de Node.js o configura tu navegador para permitir múltiples descargas

- **Problema:** Algunas imágenes no se descargan
  **Solución:** Verifica que las URLs sean accesibles públicamente

- **Problema:** El script se detiene inesperadamente
  **Solución:** Ejecuta el script nuevamente, el mapeo de URLs evitará descargar imágenes duplicadas
