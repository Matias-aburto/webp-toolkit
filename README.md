# WebP Toolkit

Esta extensión de Chrome detecta automáticamente el formato de las imágenes en cualquier página web y las marca con un borde negro de 10px junto con su formato (PNG, JPG, SVG, etc.).

## Características

- ✅ Detecta automáticamente el formato de las imágenes
- ✅ Añade bordes de colores según el formato de la imagen
- ✅ Muestra una etiqueta con el formato de la imagen
- ✅ Funciona con imágenes cargadas dinámicamente
- ✅ Interfaz de popup con estadísticas
- ✅ Soporta múltiples formatos: PNG, JPG, JPEG, GIF, SVG, WebP, BMP, ICO, TIFF
- ✅ Bordes delgados (5px) para mejor experiencia visual
- ✅ Se desactiva automáticamente al cambiar de página

## Instalación

### Paso 1: Descargar o clonar el proyecto
```bash
git clone <tu-repositorio>
cd web-optimizer
```

### Paso 2: Cargar la extensión en Chrome

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa el "Modo desarrollador" (toggle en la esquina superior derecha)
3. Haz clic en "Cargar descomprimida"
4. Selecciona la carpeta del proyecto (`web-optimizer`)
5. La extensión aparecerá en tu barra de herramientas

## Uso

1. **Activación manual**: La extensión inicia en estado inactivo para no ser invasiva
2. **Activar la extensión**: 
   - Haz clic en el icono de la extensión en la barra de herramientas
   - O abre el popup y haz clic en "Activar"
3. **Visualización**: Una vez activada, las imágenes se marcarán automáticamente con:
   - Bordes delgados de colores según el formato:
     - 🟢 **Verde (#008000)**: WebP y SVG (formatos modernos y eficientes)
     - 🟠 **Naranja (#FF7518)**: JPG y PNG (formatos tradicionales)
     - ⚫ **Negro**: Otros formatos (GIF, BMP, ICO, TIFF)
   - Una etiqueta en la esquina superior izquierda mostrando el formato
4. **Desactivar**: Haz clic nuevamente en el icono o usa el botón "Desactivar" en el popup
5. **Auto-desactivación**: Se desactiva automáticamente al cambiar de página o pestaña
6. **Estadísticas**: El popup muestra estadísticas en tiempo real de las imágenes detectadas

## Estructura del proyecto

```
web-optimizer/
├── manifest.json          # Configuración de la extensión
├── background.js         # Service worker para manejar el estado
├── content.js            # Script principal que detecta y marca imágenes
├── popup.html           # Interfaz del popup
├── popup.js             # Lógica del popup
├── icons/               # Iconos de la extensión
│   ├── icon16.png      # Icono 16x16 (placeholder)
│   ├── icon48.png      # Icono 48x48 (placeholder)
│   ├── icon128.png     # Icono 128x128 (placeholder)
│   └── icon.svg        # Icono SVG original
├── test.html           # Página de prueba
├── debug-test.html     # Página de debug para probar detección
├── generate-icons.html # Generador de iconos
└── README.md          # Documentación completa
```

## Formatos soportados

- **PNG** - Portable Network Graphics
- **JPG/JPEG** - Joint Photographic Experts Group
- **GIF** - Graphics Interchange Format
- **SVG** - Scalable Vector Graphics
- **WebP** - Web Picture format
- **BMP** - Bitmap
- **ICO** - Icon files
- **TIFF/TIF** - Tagged Image File Format

## Personalización

### Cambiar colores de los bordes

Para modificar los colores de los bordes, edita la función `getBorderColor` en `content.js`:

```javascript
function getBorderColor(format) {
  const colorMap = {
    'WebP': '#008000', // Verde para WebP
    'SVG': '#008000',  // Verde para SVG
    'JPG': '#FF7518',  // Naranja para JPG
    'PNG': '#FF7518',  // Naranja para PNG
    'GIF': '#000000',  // Negro para otros formatos
    'BMP': '#000000',
    'ICO': '#000000',
    'TIFF': '#000000',
    'Unknown': '#000000'
  };
  
  return colorMap[format] || '#000000';
}
```

### Cambiar el grosor del borde

Para modificar el grosor del borde, edita la función `createImageBorder` en `content.js`:

```javascript
borderContainer.style.cssText = `
  position: relative;
  display: inline-block;
  border: 5px solid ${borderColor};  // Cambia el grosor aquí
  padding: 3px;
  background: white;
`;
```

## Solución de problemas

### La extensión no funciona
1. Verifica que esté habilitada en `chrome://extensions/`
2. Recarga la página web
3. Verifica que no haya errores en la consola del desarrollador (F12)

### Las imágenes no se marcan
1. Asegúrate de que las imágenes tengan una extensión de archivo válida
2. Verifica que las imágenes se estén cargando correctamente
3. Algunas imágenes sin extensión pueden mostrarse como "Unknown"

### Las imágenes muestran "Unknown" cuando deberían mostrar el formato
1. **Problema común**: Algunas URLs tienen parámetros o estructuras complejas que dificultan la detección
2. **Solución**: La extensión ahora incluye múltiples métodos de detección:
   - Extracción de extensión de la URL completa
   - Análisis del pathname de la URL
   - Detección por tipo MIME (cuando la imagen está cargada)
3. **Debug**: Abre las herramientas de desarrollador (F12) y revisa la consola para ver logs detallados
4. **Prueba**: Usa el archivo `debug-test.html` para probar diferentes tipos de URLs

## Desarrollo

Para modificar la extensión:

1. Edita los archivos según necesites
2. Ve a `chrome://extensions/`
3. Haz clic en el botón de recarga en la tarjeta de tu extensión
4. Recarga las páginas web para ver los cambios

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT. 