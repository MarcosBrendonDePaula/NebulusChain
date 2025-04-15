/**
 * Nebulus Web Interface
 * JavaScript for interacting with the Nebulus blockchain via WebSocket API
 */

// Configuration
const config = {
  wsUrl: 'ws://localhost:8080',
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 5
};

// Global variables
let ws = null;
let reconnectAttempts = 0;
let nodeInfo = null;
let userKeyPair = null;

// DOM Elements
const connectStatusEl = document.getElementById('connection-status');
const connectStatusTextEl = document.getElementById('connection-status-text');
const blocksContainerEl = document.getElementById('blocks-container');
const transactionFormEl = document.getElementById('transaction-form');
const fileFormEl = document.getElementById('file-form');
const alertsContainerEl = document.getElementById('alerts-container');
const userPublicKeyEl = document.getElementById('user-public-key');
const userPrivateKeyEl = document.getElementById('user-private-key');
const generateKeyBtn = document.getElementById('generate-key-btn');
const nodeInfoEl = document.getElementById('node-info');
const fileNameEl = document.getElementById('file-name');
const fileInputEl = document.getElementById('file-input');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  connectWebSocket();
  setupEventListeners();
  generateUserKeyPair();
});

// Initialize tabs functionality
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const contentId = tab.getAttribute('data-tab');
      document.getElementById(contentId).classList.add('active');
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Transaction form submission
  if (transactionFormEl) {
    transactionFormEl.addEventListener('submit', handleTransactionSubmit);
  }
  
  // File form submission
  if (fileFormEl) {
    fileFormEl.addEventListener('submit', handleFileSubmit);
  }
  
  // Generate key button
  if (generateKeyBtn) {
    generateKeyBtn.addEventListener('click', generateUserKeyPair);
  }
  
  // File input change
  if (fileInputEl) {
    fileInputEl.addEventListener('change', updateFileName);
  }
  
  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', copyToClipboard);
  });
}

// Connect to WebSocket server
function connectWebSocket() {
  updateConnectionStatus('connecting');
  
  try {
    ws = new WebSocket(config.wsUrl);
    
    ws.onopen = handleWebSocketOpen;
    ws.onmessage = handleWebSocketMessage;
    ws.onclose = handleWebSocketClose;
    ws.onerror = handleWebSocketError;
  } catch (error) {
    console.error('WebSocket connection error:', error);
    updateConnectionStatus('disconnected');
    scheduleReconnect();
  }
}

// Handle WebSocket open event
function handleWebSocketOpen() {
  console.log('WebSocket connection established');
  updateConnectionStatus('connected');
  reconnectAttempts = 0;
  
  // Get node info
  sendWebSocketMessage('get_node_info');
  
  // Get blocks
  sendWebSocketMessage('get_blocks');
}

// Handle WebSocket message event
function handleWebSocketMessage(event) {
  try {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'response':
        handleResponse(message);
        break;
      case 'error':
        handleError(message);
        break;
      case 'new_block_event':
        handleNewBlockEvent(message);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
}

// Handle WebSocket close event
function handleWebSocketClose() {
  console.log('WebSocket connection closed');
  updateConnectionStatus('disconnected');
  scheduleReconnect();
}

// Handle WebSocket error event
function handleWebSocketError(error) {
  console.error('WebSocket error:', error);
  updateConnectionStatus('disconnected');
}

// Schedule WebSocket reconnection
function scheduleReconnect() {
  if (reconnectAttempts < config.maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${reconnectAttempts}/${config.maxReconnectAttempts} in ${config.reconnectInterval}ms`);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${reconnectAttempts}/${config.maxReconnectAttempts})...`);
      connectWebSocket();
    }, config.reconnectInterval);
  } else {
    console.error('Max reconnect attempts reached');
    showAlert('Não foi possível conectar ao servidor. Por favor, verifique se o servidor está em execução e recarregue a página.', 'danger');
  }
}

// Send WebSocket message
function sendWebSocketMessage(type, data = {}, requestId = generateRequestId()) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket is not connected');
    return;
  }
  
  const message = {
    type,
    data,
    requestId
  };
  
  ws.send(JSON.stringify(message));
  return requestId;
}

// Generate a unique request ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Update connection status UI
function updateConnectionStatus(status) {
  if (!connectStatusEl || !connectStatusTextEl) return;
  
  connectStatusEl.className = 'status-indicator';
  
  switch (status) {
    case 'connected':
      connectStatusEl.classList.add('status-connected');
      connectStatusTextEl.textContent = 'Conectado';
      break;
    case 'disconnected':
      connectStatusEl.classList.add('status-disconnected');
      connectStatusTextEl.textContent = 'Desconectado';
      break;
    case 'connecting':
      connectStatusEl.classList.add('status-disconnected');
      connectStatusTextEl.textContent = 'Conectando...';
      break;
  }
}

// Handle response messages
function handleResponse(message) {
  const { data, requestId } = message;
  
  if (data.blocks) {
    displayBlocks(data.blocks);
  }
  
  if (data.nodeInfo) {
    displayNodeInfo(data.nodeInfo);
    nodeInfo = data.nodeInfo;
  }
  
  if (data.success) {
    if (data.blockHash) {
      showAlert(`Operação concluída com sucesso! Hash do bloco: ${data.blockHash}`, 'success');
      
      if (data.token) {
        showAlert(`Token para descriptografia: ${data.token} (Guarde este token em um local seguro)`, 'info');
      }
      
      // Refresh blocks
      sendWebSocketMessage('get_blocks');
    }
  }
}

// Handle error messages
function handleError(message) {
  const { data } = message;
  showAlert(`Erro: ${data.error}`, 'danger');
}

// Handle new block events
function handleNewBlockEvent(message) {
  showAlert('Novo bloco adicionado à blockchain!', 'info');
  sendWebSocketMessage('get_blocks');
}

// Display blocks in the UI
function displayBlocks(blocks) {
  if (!blocksContainerEl) return;
  
  blocksContainerEl.innerHTML = '';
  
  if (blocks.length === 0) {
    blocksContainerEl.innerHTML = '<p>Nenhum bloco encontrado.</p>';
    return;
  }
  
  blocks.forEach(block => {
    const blockEl = document.createElement('div');
    blockEl.className = 'block-item';
    
    const timestamp = new Date(block.timestamp).toLocaleString();
    const isEncrypted = block.data.encryption ? 'Sim' : 'Não';
    const signatures = block.data.signatures ? block.data.signatures.length : 0;
    
    blockEl.innerHTML = `
      <div class="block-header">
        <span>Bloco: ${block.hash.substring(0, 8)}...</span>
        <span>${timestamp}</span>
      </div>
      <div>Tipo: ${block.data.type}</div>
      <div>Assinaturas: ${signatures}</div>
      <div>Criptografado: ${isEncrypted}</div>
      <div class="block-content">${formatBlockContent(block)}</div>
    `;
    
    blocksContainerEl.appendChild(blockEl);
  });
}

// Format block content for display
function formatBlockContent(block) {
  if (block.data.encryption) {
    return '[Conteúdo criptografado]';
  }
  
  if (typeof block.data.payload === 'object') {
    return JSON.stringify(block.data.payload, null, 2);
  }
  
  return block.data.payload;
}

// Display node info in the UI
function displayNodeInfo(info) {
  if (!nodeInfoEl) return;
  
  nodeInfoEl.innerHTML = `
    <p><strong>ID do Nó:</strong> ${info.nodeId}</p>
    <p><strong>Chave Pública:</strong> ${info.publicKey.substring(0, 20)}...</p>
    <p><strong>Blocos na Blockchain:</strong> ${info.blockchainLength}</p>
    <p><strong>Status:</strong> ${info.isActive ? 'Ativo' : 'Inativo'}</p>
  `;
}

// Handle transaction form submission
function handleTransactionSubmit(event) {
  event.preventDefault();
  
  const type = document.getElementById('transaction-type').value;
  const payload = document.getElementById('transaction-payload').value;
  const encrypt = document.getElementById('transaction-encrypt').checked;
  
  try {
    // Parse payload as JSON
    const payloadObj = JSON.parse(payload);
    
    // Create transaction object
    const transaction = {
      type,
      payload: payloadObj,
      requiredSigners: 1
    };
    
    // Add encryption if requested
    if (encrypt) {
      transaction.encryption = {
        method: 'AES-256-CBC',
        encrypted: true
      };
    }
    
    // Send transaction
    sendWebSocketMessage('add_transaction', { transaction });
    
    // Reset form
    event.target.reset();
    
  } catch (error) {
    showAlert(`Erro ao processar transação: ${error.message}`, 'danger');
  }
}

// Handle file form submission
function handleFileSubmit(event) {
  event.preventDefault();
  
  const fileInput = document.getElementById('file-input');
  const encrypt = document.getElementById('file-encrypt').checked;
  
  if (!fileInput.files || fileInput.files.length === 0) {
    showAlert('Por favor, selecione um arquivo.', 'warning');
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const fileContent = e.target.result.split(',')[1]; // Get base64 part
    
    // Send file to blockchain
    sendWebSocketMessage('add_file', {
      fileName: file.name,
      fileContent: fileContent,
      shouldEncrypt: encrypt
    });
  };
  
  reader.onerror = function(error) {
    showAlert(`Erro ao ler o arquivo: ${error}`, 'danger');
  };
  
  reader.readAsDataURL(file);
}

// Update file name display
function updateFileName() {
  if (!fileInputEl || !fileNameEl) return;
  
  if (fileInputEl.files && fileInputEl.files.length > 0) {
    fileNameEl.textContent = fileInputEl.files[0].name;
  } else {
    fileNameEl.textContent = '';
  }
}

// Generate a key pair for the user
function generateUserKeyPair() {
  if (!userPublicKeyEl || !userPrivateKeyEl) return;
  
  // In a real implementation, we would use a proper crypto library
  // For this demo, we'll generate a simple key pair
  const keyPair = {
    publicKey: generateRandomKey(64),
    privateKey: generateRandomKey(128)
  };
  
  userKeyPair = keyPair;
  
  userPublicKeyEl.textContent = keyPair.publicKey;
  userPrivateKeyEl.textContent = keyPair.privateKey;
  
  showAlert('Nova chave gerada com sucesso!', 'success');
}

// Generate a random key (hex string)
function generateRandomKey(length) {
  const chars = '0123456789abcdef';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Copy text to clipboard
function copyToClipboard(event) {
  const button = event.target;
  const textEl = document.getElementById(button.getAttribute('data-copy'));
  
  if (!textEl) return;
  
  const text = textEl.textContent;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copiado!';
      
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    })
    .catch(err => {
      console.error('Erro ao copiar texto:', err);
    });
}

// Show alert message
function showAlert(message, type = 'info') {
  if (!alertsContainerEl) return;
  
  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type}`;
  alertEl.textContent = message;
  
  alertsContainerEl.appendChild(alertEl);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    alertEl.remove();
  }, 5000);
}
