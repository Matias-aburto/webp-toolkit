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

// Función para obtener estadísticas de las imágenes en la página actual
function getImageStats() {
  return new Promise((resolve) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: () => {
          const images = document.querySelectorAll('img[data-format-detected]');
          const formatCounts = {};
          let total = 0;
          
          images.forEach(img => {
            const label = img.closest('div')?.querySelector('div[style*="position: absolute"]');
            if (label) {
              const format = label.textContent;
              formatCounts[format] = (formatCounts[format] || 0) + 1;
              total++;
            }
          });
          
          return { total, formatCounts };
        }
      }, (results) => {
        if (results && results[0] && results[0].result) {
          resolve(results[0].result);
        } else {
          resolve({ total: 0, formatCounts: {} });
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

// Función para actualizar la interfaz con las estadísticas
function updateStats() {
  if (!isActive) {
    document.getElementById('total-images').textContent = '0';
    document.getElementById('format-breakdown').innerHTML = '<div class="format-count"><span>Extensión desactivada</span></div>';
    return;
  }
  
  getImageStats().then(stats => {
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
  });
}

// Inicializar cuando se carga el popup
document.addEventListener('DOMContentLoaded', async () => {
  // Obtener el estado inicial
  isActive = await getExtensionStatus();
  updateUI();
  
  // Configurar el botón de toggle
  document.getElementById('toggle-button').addEventListener('click', toggleExtension);
  
  // Actualizar estadísticas iniciales
  updateStats();
});

// Actualizar cada 2 segundos para mantener las estadísticas actualizadas
setInterval(updateStats, 2000); 