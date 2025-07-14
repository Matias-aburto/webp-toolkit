// Estado global de la extensión
let isActive = false;

// Función para actualizar el icono según el estado
function updateIcon() {
  const iconPath = isActive ? "icons/icon48.png" : "icons/icon48.png";
  chrome.action.setIcon({
    path: iconPath
  });
  
  // Actualizar el título del icono
  const title = isActive ? 
    "Image Format Detector - ACTIVO (Click para desactivar)" : 
    "Image Format Detector - INACTIVO (Click para activar)";
  
  chrome.action.setTitle({
    title: title
  });
}

// Función para desactivar la extensión automáticamente
function deactivateExtension() {
  if (!isActive) return; // Ya está desactivada
  
  isActive = false;
  console.log('🔴 Image Format Detector desactivado automáticamente al cambiar de página');
  
  // Guardar el estado en el storage
  chrome.storage.local.set({ isActive: false });
  
  // Actualizar el icono
  updateIcon();
  
  // Enviar mensaje a todas las pestañas activas para desactivar
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'deactivate'
      }).catch(() => {
        // Ignorar errores si la pestaña no tiene content script
      });
    });
  });
}

// Función para activar/desactivar la extensión en la pestaña actual
function toggleExtension(tab) {
  isActive = !isActive;
  
  // Guardar el estado en el storage
  chrome.storage.local.set({ isActive: isActive });
  
  // Actualizar el icono
  updateIcon();
  
  // Enviar mensaje al content script
  chrome.tabs.sendMessage(tab.id, {
    action: isActive ? 'activate' : 'deactivate'
  });
}

// Escuchar clics en el icono de la extensión
chrome.action.onClicked.addListener((tab) => {
  toggleExtension(tab);
});

// Escuchar cambios de pestaña para desactivar automáticamente
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Desactivar automáticamente al cambiar de pestaña
  deactivateExtension();
});

// Escuchar navegación en pestañas para desactivar automáticamente
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.startsWith('http')) {
    // Desactivar automáticamente al navegar a una nueva página
    deactivateExtension();
  }
});

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ isActive: isActive });
  } else if (request.action === 'toggle') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        toggleExtension(tabs[0]);
        sendResponse({ isActive: isActive });
      }
    });
    return true; // Indica que la respuesta será asíncrona
  }
});

// Inicializar el estado al cargar la extensión
chrome.storage.local.get(['isActive'], (result) => {
  isActive = result.isActive || false;
  updateIcon();
});

// Manejar cuando se instala la extensión
chrome.runtime.onInstalled.addListener(() => {
  // Establecer estado inicial como inactivo
  isActive = false;
  chrome.storage.local.set({ isActive: false });
  updateIcon();
}); 