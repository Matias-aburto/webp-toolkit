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

  // Crear un contenedor relativo solo si no existe
  let container = img.parentElement;
  let needsContainer = true;
  if (container && container.classList.contains('img-border-container')) {
    needsContainer = false;
  }
  if (needsContainer) {
    const wrapper = document.createElement('span');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.className = 'img-border-container';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    container = wrapper;
  }

  // Insertar el label
  container.appendChild(formatLabel);
}

// Función principal para procesar todas las imágenes
function processImages() {
  const images = document.querySelectorAll('img');
  
  images.forEach(async img => {
    // Esperar a que la imagen se cargue si no está cargada
    if (img.complete) {
      const format = detectImageFormat(img);
      await createImageBorder(img, format);
    } else {
      img.addEventListener('load', async () => {
        const format = detectImageFormat(img);
        await createImageBorder(img, format);
      });
    }
  });
}

// Variables globales para el estado de la extensión
let isActive = false;
let observer = null;

// Función para activar la extensión
function activateExtension() {
  if (isActive) return; // Ya está activa
  
  isActive = true;
  console.log('🟢 Image Format Detector activado');
  
  // Procesar imágenes existentes
  processImages();
  
  // Iniciar el observador para nuevas imágenes
  observer = new MutationObserver((mutations) => {
    if (!isActive) return; // No procesar si está desactivada
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Buscar imágenes en el nodo añadido
          const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
          if (node.tagName === 'IMG') {
            images.push(node);
          }
          
          images.forEach(async img => {
            if (!img.hasAttribute('data-format-detected')) {
              const format = detectImageFormat(img);
              await createImageBorder(img, format);
            }
          });
        }
      });
    });
  });
  
  // Iniciar el observador
  observer.observe(document.body, {
    childList: true,
    subtree: true
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
  
  // Remover todos los bordes existentes (todos los colores)
  const borderContainers = document.querySelectorAll('div[style*="border: 5px solid"]');
  borderContainers.forEach(container => {
    const img = container.querySelector('img');
    if (img) {
      // Remover el atributo de detección
      img.removeAttribute('data-format-detected');
      // Mover la imagen de vuelta a su posición original
      container.parentNode.insertBefore(img, container);
      // Remover el contenedor del borde
      container.remove();
    }
  });
}

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activate') {
    activateExtension();
  } else if (request.action === 'deactivate') {
    deactivateExtension();
  }
});

// Verificar el estado inicial al cargar la página
chrome.storage.local.get(['isActive'], (result) => {
  if (result.isActive) {
    // Si estaba activa, activar después de que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', activateExtension);
    } else {
      activateExtension();
    }
  }
});

// También verificar cuando la ventana se carga completamente
window.addEventListener('load', () => {
  chrome.storage.local.get(['isActive'], (result) => {
    if (result.isActive && !isActive) {
      activateExtension();
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