import os 

def cargar_videos(upload):
    maximo = 80 * 1024 * 1024 
    formatos_permitidos = ['.mp3', '.mp4', '.mov', '.avi']
    
    nombre, extension = os.path.splitext(upload)
    
    if extension.lower() not in formatos_permitidos:
        return "formato no valido"
    peso = os.path.getsize(upload)
    if peso > maximo:
        return "el video sobre pasa el tamaño permitido"
        
    return upload
