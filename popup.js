// Variables globales
let isActive = false;
let localFiles = [];
let isConverting = false;
const API_BASE_URL = 'https://webp.simetry.cl';
const CONVERT_ENDPOINT = `${API_BASE_URL}/convert`;

// ===== FUNCIONALIDAD DE PESTAÑAS =====

// Función para configurar el sistema de pestañas
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      
      // Remover clase active de todas las pestañas y contenidos
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Agregar clase active a la pestaña clickeada y su contenido
      tab.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });
}

// Función para convertir imagen a WebP
async function convertToWebP(imageUrl, quality = 80, maxDimensions = {}) {
    try {
        // Extraer el nombre del archivo de la URL
        const urlParts = imageUrl.split('/');
        const originalFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remover query parameters
        const fileNameWithoutExt = originalFileName.split('.')[0]; // Remover extensión
        
        // Obtener la imagen como blob
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Error al obtener la imagen: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Crear FormData con la imagen usando el nombre original
        const formData = new FormData();
        formData.append('image', blob, originalFileName);
        formData.append('quality', quality);
        
        // Agregar dimensiones máximas si están definidas
        if (maxDimensions.maxWidth) {
            formData.append('maxWidth', maxDimensions.maxWidth);
        }
        if (maxDimensions.maxHeight) {
            formData.append('maxHeight', maxDimensions.maxHeight);
        }

        // Hacer petición POST al endpoint
        const convertResponse = await fetch(CONVERT_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        if (!convertResponse.ok) {
            throw new Error(`Error en conversión: ${convertResponse.status} - ${await convertResponse.text()}`);
        }

        // Obtener el archivo WebP como blob
        const webpBlob = await convertResponse.blob();
        
        // Crear URL para descarga
        const url = URL.createObjectURL(webpBlob);
        
        // Crear sufijo para dimensiones si se aplicaron
        let dimensionSuffix = '';
        if (maxDimensions.maxWidth || maxDimensions.maxHeight) {
            const parts = [];
            if (maxDimensions.maxWidth) parts.push(`w${maxDimensions.maxWidth}`);
            if (maxDimensions.maxHeight) parts.push(`h${maxDimensions.maxHeight}`);
            dimensionSuffix = `_${parts.join('x')}`;
        }
        
        // Descargar automáticamente con el nombre original + _converted.webp
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileNameWithoutExt}${dimensionSuffix}_converted.webp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Limpiar URL
        URL.revokeObjectURL(url);
        
        return true;
    } catch (error) {
        console.error('Error en conversión:', error);
        throw error;
    }
}

// Función para obtener el estado de la extensión
function getExtensionStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      resolve(response ? response.isActive : false);
    });
  });
}

// Función para cambiar el estado de la extensión
function toggleExtension() {
  chrome.runtime.sendMessage({ action: 'toggle' }, (response) => {
    if (response) {
      isActive = response.isActive;
      updateUI();
    }
  });
}

// Función para actualizar la interfaz según el estado
function updateUI() {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const toggleButton = document.getElementById('toggle-button');
  const toggleText = document.getElementById('toggle-text');
  
  if (isActive) {
    statusIndicator.className = 'status active';
    statusText.textContent = '✅ Extensión activa';
    toggleButton.className = 'toggle-btn active';
    toggleText.textContent = 'Desactivar';
  } else {
    statusIndicator.className = 'status inactive';
    statusText.textContent = '❌ Extensión inactiva';
    toggleButton.className = 'toggle-btn';
    toggleText.textContent = 'Activar';
  }
}

// Sobrescribir getImageStatsAndList para usar window.reportImagesForPopup
function getImageStatsAndList() {
  return new Promise((resolve) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: () => {
          const images = window.reportImagesForPopup ? window.reportImagesForPopup() : [];
          const formatCounts = {};
          let total = 0;
          images.forEach(img => {
            formatCounts[img.format] = (formatCounts[img.format] || 0) + 1;
            total++;
          });
          return { total, formatCounts, imageList: images };
        }
      }, (results) => {
        if (results && results[0] && results[0].result) {
          resolve(results[0].result);
        } else {
          resolve({ total: 0, formatCounts: {}, imageList: [] });
        }
      });
    });
  });
}

// Función para obtener el color del formato
function getFormatColor(format) {
  const colorMap = {
    'WebP': '#008000',
    'SVG': '#008000',
    'JPG': '#FF7518',
    'PNG': '#FF7518',
    'GIF': '#000000',
    'BMP': '#000000',
    'ICO': '#000000',
    'TIFF': '#000000',
    'Unknown': '#000000'
  };
  
  return colorMap[format] || '#000000';
}

// Guardar los últimos datos para el reporte
let lastStats = null;

// Función para descargar el reporte como CSV
function downloadReportCSV() {
  if (!lastStats) return;
  let csv = '';
  // Estadísticas
  csv += 'Formato,Cantidad,Peso total (KB)\n';
  Object.entries(lastStats.formatCounts).forEach(([format, count]) => {
    const totalKB = lastStats.formatSizes && lastStats.formatSizes[format] ? lastStats.formatSizes[format] : 0;
    csv += `${format},${count},${totalKB}\n`;
  });
  csv += '\nListado de imágenes:\n';
  csv += 'Tipo,URL,Formato,Peso (KB)\n';
  lastStats.imageList.forEach(img => {
    const tipo = img.type || 'img';
    csv += `${tipo},"${img.url}",${img.format},${img.size != null ? img.size : ''}\n`;
  });
  // Descargar
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte-imagenes.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Función para actualizar la interfaz con las estadísticas y la tabla
function updateStatsAndList() {
  if (!isActive) {
    document.getElementById('total-images').textContent = '0';
    document.getElementById('format-breakdown').innerHTML = '<div class="format-count"><span>Extensión desactivada</span></div>';
    document.getElementById('image-list').innerHTML = '<tr><td colspan="4">Extensión desactivada</td></tr>';
    lastStats = null;
    return;
  }
  getImageStatsAndList().then(stats => {
    // Filtrar URLs únicas
    const uniqueMap = new Map();
    stats.imageList.forEach(img => {
      if (!uniqueMap.has(img.url)) {
        uniqueMap.set(img.url, img);
      }
    });
    const uniqueList = Array.from(uniqueMap.values());
    // Calcular peso total y conteo por formato solo con URLs únicas
    const formatCounts = {};
    const formatSizes = {};
    uniqueList.forEach(img => {
      formatCounts[img.format] = (formatCounts[img.format] || 0) + 1;
      if (!formatSizes[img.format]) formatSizes[img.format] = 0;
      if (typeof img.size === 'number') formatSizes[img.format] += img.size;
    });
    lastStats = { ...stats, imageList: uniqueList, formatCounts, formatSizes };
    document.getElementById('total-images').textContent = uniqueList.length;
    const breakdown = document.getElementById('format-breakdown');
    breakdown.innerHTML = '';
    if (uniqueList.length === 0) {
      breakdown.innerHTML = '<div class="format-count"><span>No se han detectado imágenes</span></div>';
    } else {
      Object.entries(formatCounts).forEach(([format, count]) => {
        const div = document.createElement('div');
        div.className = 'format-count';
        const color = getFormatColor(format);
        const totalKB = formatSizes[format] || 0;
        div.innerHTML = `<span style=\"color: ${color}; font-weight: bold;\">${format}:</span> <span>${count} imagen${count === 1 ? '' : 'es'} — ${totalKB} KB</span>`;
        breakdown.appendChild(div);
      });
    }
    // Tabla de imágenes
    const imageListTbody = document.getElementById('image-list');
    imageListTbody.innerHTML = '';
    if (uniqueList.length === 0) {
      imageListTbody.innerHTML = '<tr><td colspan="4">No se han detectado imágenes</td></tr>';
    } else {
      // Ordenar por peso de mayor a menor (nulls al final)
      uniqueList.sort((a, b) => {
        if (b.size == null && a.size == null) return 0;
        if (b.size == null) return -1;
        if (a.size == null) return 1;
        return b.size - a.size;
      });
      uniqueList.forEach(img => {
        const tr = document.createElement('tr');
        // URL clickeable
        const tdUrl = document.createElement('td');
        tdUrl.className = 'image-list-url';
        tdUrl.title = img.url;
        tdUrl.textContent = img.url;
        tdUrl.style.cursor = 'pointer';
        tdUrl.onclick = () => window.open(img.url, '_blank');
        // Formato
        const tdFormat = document.createElement('td');
        tdFormat.textContent = img.format;
        // Peso
        const tdSize = document.createElement('td');
        tdSize.textContent = img.size != null ? img.size : '-';
        // Botón de conversión (solo si no es WebP)
        const tdActions = document.createElement('td');
        if (img.format !== 'WebP') {
          const convertBtn = document.createElement('button');
          convertBtn.className = 'convert-webp-btn';
          convertBtn.textContent = 'Convertir a WebP';
          convertBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Deshabilitar botón y mostrar estado de carga
            convertBtn.disabled = true;
            convertBtn.classList.add('loading');
            convertBtn.textContent = 'Convirtiendo...';
            
            try {
              // Obtener dimensiones máximas si están configuradas
              const maxDimensions = getMaxDimensions();
              await convertToWebP(img.url, 80, maxDimensions);
              convertBtn.textContent = '✅ Convertido';
              setTimeout(() => {
                convertBtn.textContent = 'Convertir a WebP';
                convertBtn.disabled = false;
                convertBtn.classList.remove('loading');
              }, 2000);
            } catch (error) {
              console.error('Error al convertir:', error);
              convertBtn.textContent = '❌ Error';
              setTimeout(() => {
                convertBtn.textContent = 'Convertir a WebP';
                convertBtn.disabled = false;
                convertBtn.classList.remove('loading');
              }, 3000);
            }
          };
          tdActions.appendChild(convertBtn);
        } else {
          // Si ya es WebP, mostrar un mensaje informativo
          const webpInfo = document.createElement('span');
          webpInfo.textContent = 'Ya es WebP';
          webpInfo.style.color = '#28a745';
          webpInfo.style.fontSize = '11px';
          webpInfo.style.fontWeight = 'bold';
          tdActions.appendChild(webpInfo);
        }
        tr.appendChild(tdUrl);
        tr.appendChild(tdFormat);
        tr.appendChild(tdSize);
        tr.appendChild(tdActions);
        imageListTbody.appendChild(tr);
      });
    }
  });
}

// Inicializar cuando se carga el popup
document.addEventListener('DOMContentLoaded', async () => {
  // Configurar pestañas primero
  setupTabs();
  // Obtener el estado inicial
  isActive = await getExtensionStatus();
  updateUI();
  // Configurar el botón de toggle
  document.getElementById('toggle-button').addEventListener('click', toggleExtension);
  // Actualizar estadísticas y lista iniciales
  updateStatsAndList();
  // Configurar drag & drop
  setupDragAndDrop();
});

// Actualizar cada 2 segundos para mantener las estadísticas y la lista actualizadas
setInterval(updateStatsAndList, 2000); 

document.getElementById('download-report-btn').addEventListener('click', downloadReportCSV);

// ===== FUNCIONALIDAD DE DRAG & DROP PARA IMÁGENES LOCALES =====

// Obtener referencia al slider y valor
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');

if (qualitySlider && qualityValue) {
  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value;
  });
}

// Configurar validación de escalas
const scaleCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="scale-"]');
scaleCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    const selectedScales = getSelectedScales();
    // Si no hay ninguna escala seleccionada, marcar 1x por defecto
    if (selectedScales.length === 0) {
      document.getElementById('scale-1').checked = true;
    }
  });
});

// Función para obtener la calidad seleccionada
function getSelectedQuality() {
  return qualitySlider ? parseInt(qualitySlider.value, 10) : 80;
}

// Función para obtener las escalas seleccionadas
function getSelectedScales() {
  const scaleCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="scale-"]:checked');
  return Array.from(scaleCheckboxes).map(cb => parseFloat(cb.value));
}

// Función para obtener las dimensiones máximas
function getMaxDimensions() {
  const maxWidth = document.getElementById('max-width-input').value;
  const maxHeight = document.getElementById('max-height-input').value;
  
  return {
    maxWidth: maxWidth ? parseInt(maxWidth) : null,
    maxHeight: maxHeight ? parseInt(maxHeight) : null
  };
}

// Función para convertir archivo local a WebP con escalas y dimensiones máximas
async function convertLocalFileToWebP(file, quality, scales = [1], maxDimensions = {}) {
    try {
        const results = [];
        
        for (const scale of scales) {
            // Crear FormData con el archivo
            const formData = new FormData();
            
            // Para archivos HEIC, asegurar que se envíe con el tipo correcto
            const fileNameLower = file.name.toLowerCase();
            const isHeic = fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif');
            
            if (isHeic) {
                // Algunos exploradores entregan HEIC/HEIF como octet-stream.
                // Forzamos MIME y "format" para que el backend pueda rutear correctamente.
                const heicMimeType = fileNameLower.endsWith('.heif') ? 'image/heif' : 'image/heic';
                const heicFormat = fileNameLower.endsWith('.heif') ? 'heif' : 'heic';
                const heicBlob = new Blob([file], { type: heicMimeType });
                formData.append('image', heicBlob, file.name);
                formData.append('format', heicFormat);
                console.log('Enviando archivo HEIC/HEIF:', {
                    fileName: file.name,
                    originalType: file.type,
                    newType: heicMimeType,
                    format: heicFormat,
                    fileSize: file.size
                });
            } else {
                formData.append('image', file);
            }
            
            formData.append('quality', quality);
            formData.append('scale', scale);
            
            // Agregar dimensiones máximas si están definidas
            if (maxDimensions.maxWidth) {
                formData.append('maxWidth', maxDimensions.maxWidth);
            }
            if (maxDimensions.maxHeight) {
                formData.append('maxHeight', maxDimensions.maxHeight);
            }

            // Hacer petición POST al endpoint con headers adicionales
            const response = await fetch(CONVERT_ENDPOINT, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'image/webp,image/*,*/*'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error del servidor:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    isHeic: isHeic
                });
                throw new Error(`Error en conversión: ${response.status} - ${errorText}`);
            }

            // Obtener el archivo WebP como blob
            const webpBlob = await response.blob();
            
            // Crear URL para descarga
            const url = URL.createObjectURL(webpBlob);
            
            // Extraer nombre del archivo sin extensión
            const fileNameWithoutExt = file.name.split('.')[0];
            
            // Crear sufijo para la escala
            const scaleSuffix = scale === 1 ? '' : `_${scale}x`;
            
            // Crear sufijo para dimensiones si se aplicaron
            let dimensionSuffix = '';
            if (maxDimensions.maxWidth || maxDimensions.maxHeight) {
                const parts = [];
                if (maxDimensions.maxWidth) parts.push(`w${maxDimensions.maxWidth}`);
                if (maxDimensions.maxHeight) parts.push(`h${maxDimensions.maxHeight}`);
                dimensionSuffix = `_${parts.join('x')}`;
            }
            
            // Descargar automáticamente
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileNameWithoutExt}${scaleSuffix}${dimensionSuffix}_converted.webp`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Limpiar URL
            URL.revokeObjectURL(url);
            
            results.push({ scale, success: true });
            
            // Pequeña pausa entre conversiones de diferentes escalas
            if (scales.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        return results;
    } catch (error) {
        console.error('Error en conversión:', error);
        throw error;
    }
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para obtener las dimensiones de una imagen
function getImageDimensions(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };
        img.onerror = () => {
            resolve(null);
        };
        img.src = URL.createObjectURL(file);
    });
}

// Función para agregar archivos a la lista
async function addFiles(files) {
    Array.from(files).forEach(file => {
        // Verificar que sea una imagen o un archivo HEIC
        const isImage = file.type.startsWith('image/');
        const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                      file.name.toLowerCase().endsWith('.heif') ||
                      file.type === 'image/heic' ||
                      file.type === 'image/heif';
        
        if (isImage || isHeic) {
            // Verificar que no esté ya en la lista
            const exists = localFiles.find(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                localFiles.push(file);
            }
        }
    });
    await updateFileList();
}

// Función para actualizar la lista de archivos
async function updateFileList() {
    const fileList = document.getElementById('file-list');
    const convertAllBtn = document.getElementById('convert-all-btn');
    
    fileList.innerHTML = '';
    
    if (localFiles.length === 0) {
        fileList.innerHTML = '<div style="text-align: center; color: #666; font-size: 12px; padding: 20px;">No hay archivos seleccionados</div>';
        convertAllBtn.style.display = 'none';
        return;
    }
    
    convertAllBtn.style.display = 'block';
    
    for (let index = 0; index < localFiles.length; index++) {
        const file = localFiles[index];
        const fileItem = document.createElement('div');
        fileItem.className = 'file-list-item';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        fileName.style.cssText = 'text-align: left;';
        
        // Obtener dimensiones de la imagen
        const dimensions = await getImageDimensions(file);
        const dimensionsText = dimensions ? `${dimensions.width}×${dimensions.height}` : 'N/A';
        
        const fileDimensions = document.createElement('div');
        fileDimensions.className = 'file-dimensions';
        fileDimensions.textContent = dimensionsText;
        fileDimensions.style.cssText = 'font-size: 11px; color: #666; margin: 0 8px; min-width: 60px; text-align: left;';
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Eliminar archivo';
        removeBtn.onclick = async () => {
            localFiles.splice(index, 1);
            await updateFileList();
        };
        
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileDimensions);
        fileItem.appendChild(fileSize);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    }
}

// Función para convertir todos los archivos
async function convertAllFiles() {
    if (isConverting || localFiles.length === 0) return;
    
    isConverting = true;
    const convertAllBtn = document.getElementById('convert-all-btn');
    const originalText = convertAllBtn.textContent;
    
    convertAllBtn.disabled = true;
    convertAllBtn.textContent = 'Convirtiendo...';
    
    const quality = getSelectedQuality();
    const scales = getSelectedScales();
    const maxDimensions = getMaxDimensions();
    
    // Verificar que al menos una escala esté seleccionada
    if (scales.length === 0) {
        alert('Por favor selecciona al menos una escala de exportación.');
        convertAllBtn.textContent = originalText;
        convertAllBtn.disabled = false;
        isConverting = false;
        return;
    }
    
    try {
        for (let i = 0; i < localFiles.length; i++) {
            const file = localFiles[i];
            convertAllBtn.textContent = `Convirtiendo ${i + 1}/${localFiles.length}...`;
            
            try {
                const results = await convertLocalFileToWebP(file, quality, scales, maxDimensions);
                console.log(`✅ Convertido: ${file.name} en ${scales.length} escala(s)`);
            } catch (error) {
                console.error(`❌ Error al convertir ${file.name}:`, error);
            }
            
            // Pequeña pausa entre conversiones
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const scaleText = scales.length === 1 ? 'escala' : 'escalas';
        convertAllBtn.textContent = `✅ Todas convertidas (${scales.length} ${scaleText})`;
        setTimeout(() => {
            convertAllBtn.textContent = originalText;
            convertAllBtn.disabled = false;
            isConverting = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error en conversión masiva:', error);
        convertAllBtn.textContent = '❌ Error';
        setTimeout(() => {
            convertAllBtn.textContent = originalText;
            convertAllBtn.disabled = false;
            isConverting = false;
        }, 3000);
    }
}

// Configurar drag & drop
function setupDragAndDrop() {
    const dragDropArea = document.getElementById('drag-drop-area');
    const fileInput = document.getElementById('file-input');
    const convertAllBtn = document.getElementById('convert-all-btn');
    
    // Click en el área para abrir selector de archivos
    dragDropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Selección de archivos
    fileInput.addEventListener('change', async (e) => {
        await addFiles(e.target.files);
        fileInput.value = ''; // Limpiar input
    });
    
    // Drag & drop
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('dragover');
    });
    
    dragDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('dragover');
    });
    
    dragDropArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('dragover');
        await addFiles(e.dataTransfer.files);
    });
    
    // Botón convertir todas
    convertAllBtn.addEventListener('click', convertAllFiles);
}