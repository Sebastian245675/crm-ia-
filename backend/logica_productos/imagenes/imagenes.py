import os
from PIL import Image  # <-- 1. Importamos Pillow para manejar imágenes

def cargar_imagenes(upload):
    limite = 30 * 1024 * 1024
    formatos_permitidos = ['.jpg', '.jpeg', '.png', '.webp']
    
    # Extraemos la ruta base (sin extensión) y la extensión actual
    nombre_base, extension = os.path.splitext(upload)
    
    peso = os.path.getsize(upload)
    if peso > limite:
        return "la imagen sobre pasa los 30 mb"
        
    if extension.lower() not in formatos_permitidos:
        return "el formato no es permitido"

    # Si la imagen ya es .webp, no hace falta convertirla
    if extension.lower() == '.webp':
        return upload

    ruta_webp = nombre_base + ".webp"

    try:
        with Image.open(upload) as img:
            img.save(ruta_webp, 'webp', quality=80)
        
        os.remove(upload)
        
        return ruta_webp

    except Exception as e:
        return f"Error al convertir la imagen: {str(e)}"
