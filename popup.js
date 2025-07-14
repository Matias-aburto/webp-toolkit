// Variables globales
let isActive = false;

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
  csv += 'Estadísticas por formato:\n';
  Object.entries(lastStats.formatCounts).forEach(([format, count]) => {
    csv += `${format},${count}\n`;
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
    document.getElementById('image-list').innerHTML = '<tr><td colspan="3">Extensión desactivada</td></tr>';
    lastStats = null;
    return;
  }
  getImageStatsAndList().then(stats => {
    // Detectar tipo (img o bg) para cada imagen
    stats.imageList.forEach(img => {
      if (img.isBackground) {
        img.type = 'bg';
      } else {
        img.type = 'img';
      }
    });
    lastStats = stats;
    document.getElementById('total-images').textContent = stats.total;
    const breakdown = document.getElementById('format-breakdown');
    breakdown.innerHTML = '';
    if (stats.total === 0) {
      breakdown.innerHTML = '<div class="format-count"><span>No se han detectado imágenes</span></div>';
    } else {
      Object.entries(stats.formatCounts).forEach(([format, count]) => {
        const div = document.createElement('div');
        div.className = 'format-count';
        const color = getFormatColor(format);
        div.innerHTML = `<span style="color: ${color}; font-weight: bold;">${format}:</span><span>${count}</span>`;
        breakdown.appendChild(div);
      });
    }
    // Tabla de imágenes
    const imageListTbody = document.getElementById('image-list');
    imageListTbody.innerHTML = '';
    if (stats.imageList.length === 0) {
      imageListTbody.innerHTML = '<tr><td colspan="3">No se han detectado imágenes</td></tr>';
    } else {
      // Ordenar por peso de mayor a menor (nulls al final)
      stats.imageList.sort((a, b) => {
        if (b.size == null && a.size == null) return 0;
        if (b.size == null) return -1;
        if (a.size == null) return 1;
        return b.size - a.size;
      });
      stats.imageList.forEach(img => {
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
        tr.appendChild(tdUrl);
        tr.appendChild(tdFormat);
        tr.appendChild(tdSize);
        imageListTbody.appendChild(tr);
      });
    }
  });
}

// Inicializar cuando se carga el popup
document.addEventListener('DOMContentLoaded', async () => {
  // Obtener el estado inicial
  isActive = await getExtensionStatus();
  updateUI();
  // Configurar el botón de toggle
  document.getElementById('toggle-button').addEventListener('click', toggleExtension);
  // Actualizar estadísticas y lista iniciales
  updateStatsAndList();
});
// Actualizar cada 2 segundos para mantener las estadísticas y la lista actualizadas
setInterval(updateStatsAndList, 2000); 

document.getElementById('download-report-btn').addEventListener('click', downloadReportCSV); 