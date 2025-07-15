// Función para extraer la extensión de una URL de imagen
function extractExtensionFromUrl(url) {
  try {
    // Remover parámetros de query y fragmentos
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Buscar la extensión en diferentes partes de la URL
    const urlParts = cleanUrl.split('.');
    if (urlParts.length > 1) {
      const extension = urlParts[urlParts.length - 1].toLowerCase();
      
      // Verificar que sea una extensión válida de imagen
      const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'tif'];
      if (validExtensions.includes(extension)) {
        return extension;
      }
    }
    
    // Si no se encontró en la URL completa, intentar con el pathname
    const urlObj = new URL(url, window.location.href);
    const pathname = urlObj.pathname;
    const pathParts = pathname.split('.');
    if (pathParts.length > 1) {
      const extension = pathParts[pathParts.length - 1].toLowerCase();
      const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'tif'];
      if (validExtensions.includes(extension)) {
        return extension;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting extension from URL:', url, error);
    return null;
  }
}

// Función para detectar el formato de una imagen
function detectImageFormat(img) {
  const src = img.src || img.getAttribute('src');
  if (!src) return 'Unknown';
  
  try {
    // Método 1: Extraer extensión de la URL
    let extension = extractExtensionFromUrl(src);
    
    // Método 2: Intentar detectar por el tipo MIME si la imagen ya está cargada
    if (!extension && img.complete && img.naturalWidth > 0) {
      try {
        // Crear un canvas para detectar el tipo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        
        // Intentar obtener el tipo MIME
        const dataURL = canvas.toDataURL();
        if (dataURL.startsWith('data:image/')) {
          const mimeType = dataURL.split(';')[0].split(':')[1];
          const mimeMap = {
            'image/png': 'PNG',
            'image/jpeg': 'JPG',
            'image/gif': 'GIF',
            'image/svg+xml': 'SVG',
            'image/webp': 'WebP',
            'image/bmp': 'BMP',
            'image/x-icon': 'ICO',
            'image/tiff': 'TIFF'
          };
          if (mimeMap[mimeType]) {
            console.log('Detected by MIME type:', mimeType);
            return mimeMap[mimeType];
          }
        }
      } catch (e) {
        console.log('MIME detection failed:', e);
      }
    }
    
    // Mapear extensiones a formatos
    const formatMap = {
      'png': 'PNG',
      'jpg': 'JPG',
      'jpeg': 'JPG',
      'gif': 'GIF',
      'svg': 'SVG',
      'webp': 'WebP',
      'bmp': 'BMP',
      'ico': 'ICO',
      'tiff': 'TIFF',
      'tif': 'TIFF'
    };
    
    // Debug: Log para ver qué se está detectando
    console.log('Image URL:', src);
    console.log('Detected extension:', extension);
    console.log('Format:', formatMap[extension] || 'Unknown');
    
    return formatMap[extension] || 'Unknown';
  } catch (error) {
    console.error('Error detecting format for image:', src, error);
    return 'Unknown';
  }
}

// Función para obtener el color del borde según el formato
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

// Función para obtener el peso de la imagen en KB (usa HEAD si es posible, si no, intenta con fetch)
async function getImageSizeInKB(img) {
  const src = img.src || img.getAttribute('src');
  if (!src) return null;
  try {
    // Intentar con HEAD primero
    const response = await fetch(src, { method: 'HEAD' });
    const size = response.headers.get('Content-Length');
    if (size) {
      return Math.round(parseInt(size, 10) / 1024);
    }
  } catch (e) {
    // Si HEAD falla, intentar con GET (solo si es seguro)
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      return Math.round(blob.size / 1024);
    } catch (e2) {
      return null;
    }
  }
  return null;
}

// Función para crear el borde con información del formato y peso
async function createImageBorder(img, format) {
  // Verificar si ya tiene el borde aplicado
  if (img.hasAttribute('data-format-detected')) {
    return;
  }

  // Marcar como procesada
  img.setAttribute('data-format-detected', 'true');

  // Obtener el color del borde según el formato
  const borderColor = getBorderColor(format);

  // Crear el contorno visual usando outline (no afecta layout)
  img.style.outline = `5px solid ${borderColor}`;
  img.style.outlineOffset = '-2px';

  // Crear el label flotante
  const formatLabel = document.createElement('div');
  formatLabel.className = 'img-format-label';
  formatLabel.style.cssText = `
    position: absolute;
    top: 2px;
    left: 8px;
    background: ${borderColor};
    color: white;
    padding: 1px 8px 1px 8px;
    font-size: 13px;
    font-weight: bold;
    border-radius: 3px;
    z-index: 1000;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    line-height: 1.2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  `;
  formatLabel.textContent = format;

  // Obtener el peso de la imagen y agregarlo en texto pequeño
  const sizeKB = await getImageSizeInKB(img);
  if (sizeKB !== null) {
    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = `${sizeKB} KB`;
    sizeLabel.style.cssText = `
      font-size: 10px;
      font-weight: normal;
      color: #fff;
      opacity: 0.85;
      margin-top: 1px;
    `;
    formatLabel.appendChild(sizeLabel);
  }

  // Asegurar que el contenedor padre tenga posición relativa
  const parent = img.parentElement;
  if (window.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  // Insertar el label en el contenedor padre
  parent.appendChild(formatLabel);
}

// Función para extraer la URL de un background-image
function extractBackgroundImageUrl(style) {
  const match = style.match(/url\(["']?(.*?)["']?\)/);
  return match ? match[1] : null;
}

// Función para procesar imágenes de fondo
async function processBackgroundImages() {
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    if (el.hasAttribute('data-bg-image-detected')) continue;
    const style = window.getComputedStyle(el);
    const bg = style.getPropertyValue('background-image');
    if (bg && bg !== 'none') {
      const url = extractBackgroundImageUrl(bg);
      if (url) {
        // Detectar formato
        const format = detectImageFormat({ src: url });
        // Crear label y borde igual que para <img>
        await createBackgroundImageBorder(el, url, format);
        el.setAttribute('data-bg-image-detected', 'true');
      }
    }
  }
}

// Función para crear borde y label en imágenes de fondo
async function createBackgroundImageBorder(el, url, format) {
  // Evitar duplicados
  if (el.querySelector('.bg-image-label')) return;
  const borderColor = getBorderColor(format);
  el.style.outline = `5px solid ${borderColor}`;
  el.style.outlineOffset = '-2px';
  // Crear label flotante
  const label = document.createElement('div');
  label.className = 'bg-image-label';
  label.style.cssText = `
    position: absolute;
    top: 2px;
    left: 8px;
    background: ${borderColor};
    color: white;
    padding: 1px 8px 1px 8px;
    font-size: 13px;
    font-weight: bold;
    border-radius: 3px;
    z-index: 1000;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    line-height: 1.2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  `;
  label.textContent = format;
  // Obtener el peso
  const sizeKB = await getImageSizeInKB({ src: url });
  if (sizeKB !== null) {
    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = `${sizeKB} KB`;
    sizeLabel.style.cssText = `
      font-size: 10px;
      font-weight: normal;
      color: #fff;
      opacity: 0.85;
      margin-top: 1px;
    `;
    label.appendChild(sizeLabel);
  }
  // Crear contenedor relativo si es necesario
  if (window.getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }
  el.appendChild(label);
}

// Función principal para procesar todas las imágenes
async function processImages() {
  const images = document.querySelectorAll('img');
  
  for (const img of images) {
    // Esperar a que la imagen se cargue si no está cargada
    if (img.complete) {
      const format = detectImageFormat(img);
      await createImageBorder(img, format);
    } else {
      await new Promise((resolve) => {
        img.addEventListener('load', async () => {
          const format = detectImageFormat(img);
          await createImageBorder(img, format);
          resolve();
        });
      });
    }
  }
}

// Variables globales para el estado de la extensión
let isActive = false;
let observer = null;

// Función para activar la extensión
async function activateExtension() {
  if (isActive) return; // Ya está activa
  
  isActive = true;
  console.log('🟢 Image Format Detector activado');
  
  // Procesar imágenes existentes
  await processImages();
  await processBackgroundImages(); // Procesar imágenes de fondo existentes
  
  // Iniciar el observador para nuevas imágenes
  observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Buscar imágenes en el nodo añadido
          const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
          if (node.tagName === 'IMG') {
            images.push(node);
          }
          for (const img of images) {
            if (!img.hasAttribute('data-format-detected')) {
              const format = detectImageFormat(img);
              await createImageBorder(img, format);
            }
          }
          // Buscar imágenes de fondo en el nodo añadido
          const backgroundImages = node.querySelectorAll ? node.querySelectorAll('*') : [];
          for (const el of backgroundImages) {
            if (el.hasAttribute('data-bg-image-detected')) continue;
            const style = window.getComputedStyle(el);
            const bg = style.getPropertyValue('background-image');
            if (bg && bg !== 'none') {
              const url = extractBackgroundImageUrl(bg);
              if (url) {
                const format = detectImageFormat({ src: url });
                await createBackgroundImageBorder(el, url, format);
                el.setAttribute('data-bg-image-detected', 'true');
              }
            }
          }
        }
      }
    }
  });
  
  // Iniciar el observador
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-src', 'style', 'background-image']
  });
}

// Función para desactivar la extensión
function deactivateExtension() {
  if (!isActive) return; // Ya está desactivada
  
  isActive = false;
  console.log('🔴 Image Format Detector desactivado');
  
  // Detener el observador
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  // Remover todos los bordes y etiquetas de imágenes existentes
  document.querySelectorAll('img[data-format-detected]').forEach(img => {
    // Remover el outline (borde)
    img.style.outline = 'none';
    img.style.outlineOffset = '0';
    // Remover el atributo de detección
    img.removeAttribute('data-format-detected');
    
    // Remover la etiqueta de formato si existe
    const label = img.parentElement?.querySelector('.img-format-label');
    if (label) {
      label.remove();
    }
  });

  // Remover todos los bordes y etiquetas de imágenes de fondo existentes
  document.querySelectorAll('[data-bg-image-detected]').forEach(el => {
    // Remover el outline (borde)
    el.style.outline = 'none';
    el.style.outlineOffset = '0';
    // Remover el atributo de detección
    el.removeAttribute('data-bg-image-detected');
    
    // Remover la etiqueta de formato si existe
    const label = el.querySelector('.bg-image-label');
    if (label) {
      label.remove();
    }
  });
}

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activate') {
    activateExtension().catch(console.error);
  } else if (request.action === 'deactivate') {
    deactivateExtension();
  }
});

// Verificar el estado inicial al cargar la página
chrome.storage.local.get(['isActive'], (result) => {
  if (result.isActive) {
    // Si estaba activa, activar después de que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => activateExtension().catch(console.error));
    } else {
      activateExtension().catch(console.error);
    }
  }
});

// También verificar cuando la ventana se carga completamente
window.addEventListener('load', () => {
  chrome.storage.local.get(['isActive'], (result) => {
    if (result.isActive && !isActive) {
      activateExtension().catch(console.error);
    }
  });
});

// Escuchar eventos de navegación para desactivar automáticamente
window.addEventListener('beforeunload', () => {
  // Desactivar cuando se va a navegar a otra página
  if (isActive) {
    chrome.storage.local.set({ isActive: false });
  }
});

// Escuchar cambios en la URL (para SPAs)
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    // Desactivar automáticamente al cambiar de URL
    if (isActive) {
      deactivateExtension();
    }
  }
});

// Observar cambios en el título (indicador de navegación en SPAs)
urlObserver.observe(document, {
  subtree: true,
  childList: true
}); 

// Al final del archivo, exponer la lista de imágenes para el popup
window.reportImagesForPopup = function() {
  const images = [];
  
  // <img>
  document.querySelectorAll('img[data-format-detected]').forEach(img => {
    // Buscar la etiqueta en el contenedor padre
    const label = img.parentElement?.querySelector('.img-format-label');
    if (label) {
      // Obtener el formato del primer nodo de texto (sin el span del tamaño)
      const formatText = label.childNodes[0]?.textContent || label.textContent;
      const format = formatText.trim();
      
      let size = null;
      const sizeSpan = label.querySelector('span');
      if (sizeSpan) {
        const match = sizeSpan.textContent.match(/(\d+) KB/);
        if (match) size = parseInt(match[1], 10);
      }
      
      images.push({ url: img.src, format, size, isBackground: false });
    }
  });
  
  // background-image
  document.querySelectorAll('[data-bg-image-detected]').forEach(el => {
    const label = el.querySelector('.bg-image-label');
    if (label) {
      // Obtener el formato del primer nodo de texto (sin el span del tamaño)
      const formatText = label.childNodes[0]?.textContent || label.textContent;
      const format = formatText.trim();
      
      let size = null;
      const sizeSpan = label.querySelector('span');
      if (sizeSpan) {
        const match = sizeSpan.textContent.match(/(\d+) KB/);
        if (match) size = parseInt(match[1], 10);
      }
      
      const style = window.getComputedStyle(el);
      const bg = style.getPropertyValue('background-image');
      const url = extractBackgroundImageUrl(bg);
      if (url) {
        images.push({ url, format, size, isBackground: true });
      }
    }
  });
  
  return images;
}; 