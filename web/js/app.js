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
let wallets = [];
let assets = [];
let assetBalances = {};

// DOM Elements
const connectStatusEl = document.getElementById('connection-status');
const connectStatusTextEl = document.getElementById('connection-status-text');
const blocksContainerEl = document.getElementById('blocks-container');
const walletsContainerEl = document.getElementById('wallets-container');
const assetsContainerEl = document.getElementById('assets-container');
const transactionFormEl = document.getElementById('transaction-form');
const fileFormEl = document.getElementById('file-form');
const alertsContainerEl = document.getElementById('alerts-container');
const userPublicKeyEl = document.getElementById('user-public-key');
const userPrivateKeyEl = document.getElementById('user-private-key');
const generateKeyBtn = document.getElementById('generate-key-btn');
const nodeInfoEl = document.getElementById('node-info');
const fileNameEl = document.getElementById('file-name');
const fileInputEl = document.getElementById('file-input');

// Wallet DOM Elements
const createWalletBtn = document.getElementById('create-wallet-btn');
const importWalletBtn = document.getElementById('import-wallet-btn');
const refreshWalletsBtn = document.getElementById('refresh-wallets-btn');
const createWalletFormEl = document.getElementById('create-wallet-form');
const importWalletFormEl = document.getElementById('import-wallet-form');
const sendTransactionFormEl = document.getElementById('send-transaction-form');
const walletCreateFormEl = document.getElementById('wallet-create-form');
const walletImportFormEl = document.getElementById('wallet-import-form');
const walletSendFormEl = document.getElementById('wallet-send-form');
const walletFromEl = document.getElementById('wallet-from');
const walletToEl = document.getElementById('wallet-to');

// Asset DOM Elements
const createAssetBtn = document.getElementById('create-asset-btn');
const refreshAssetsBtn = document.getElementById('refresh-assets-btn');
const createAssetFormEl = document.getElementById('create-asset-form');
const mintAssetFormEl = document.getElementById('mint-asset-form');
const transferAssetFormEl = document.getElementById('transfer-asset-form');
const burnAssetFormEl = document.getElementById('burn-asset-form');
const assetCreateFormEl = document.getElementById('asset-create-form');
const assetMintFormEl = document.getElementById('asset-mint-form');
const assetTransferFormEl = document.getElementById('asset-transfer-form');
const assetBurnFormEl = document.getElementById('asset-burn-form');
const assetCreatorEl = document.getElementById('asset-creator');
const mintAssetIdEl = document.getElementById('mint-asset-id');
const mintToAddressEl = document.getElementById('mint-to-address');
const transferAssetIdEl = document.getElementById('transfer-asset-id');
const transferFromAddressEl = document.getElementById('transfer-from-address');
const transferToAddressEl = document.getElementById('transfer-to-address');
const burnAssetIdEl = document.getElementById('burn-asset-id');
const burnFromAddressEl = document.getElementById('burn-from-address');

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
  
  // Wallet buttons
  if (createWalletBtn) {
    createWalletBtn.addEventListener('click', () => {
      createWalletFormEl.classList.remove('hidden');
      importWalletFormEl.classList.add('hidden');
      sendTransactionFormEl.classList.add('hidden');
    });
  }
  
  if (importWalletBtn) {
    importWalletBtn.addEventListener('click', () => {
      importWalletFormEl.classList.remove('hidden');
      createWalletFormEl.classList.add('hidden');
      sendTransactionFormEl.classList.add('hidden');
    });
  }
  
  if (refreshWalletsBtn) {
    refreshWalletsBtn.addEventListener('click', () => {
      sendWebSocketMessage('update_wallet_balances');
      getWallets();
    });
  }
  
  // Wallet forms
  if (walletCreateFormEl) {
    walletCreateFormEl.addEventListener('submit', handleCreateWallet);
  }
  
  if (walletImportFormEl) {
    walletImportFormEl.addEventListener('submit', handleImportWallet);
  }
  
  if (walletSendFormEl) {
    walletSendFormEl.addEventListener('submit', handleSendTransaction);
  }
  
  // Asset buttons
  if (createAssetBtn) {
    createAssetBtn.addEventListener('click', () => {
      createAssetFormEl.classList.remove('hidden');
      mintAssetFormEl.classList.add('hidden');
      transferAssetFormEl.classList.add('hidden');
      burnAssetFormEl.classList.add('hidden');
      updateWalletSelects();
    });
  }
  
  if (refreshAssetsBtn) {
    refreshAssetsBtn.addEventListener('click', () => {
      getAssets();
      getWallets(); // Para atualizar os saldos
    });
  }
  
  // Asset forms
  if (assetCreateFormEl) {
    assetCreateFormEl.addEventListener('submit', handleCreateAsset);
  }
  
  if (assetMintFormEl) {
    assetMintFormEl.addEventListener('submit', handleMintAsset);
  }
  
  if (assetTransferFormEl) {
    assetTransferFormEl.addEventListener('submit', handleTransferAsset);
  }
  
  if (assetBurnFormEl) {
    assetBurnFormEl.addEventListener('submit', handleBurnAsset);
  }
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
  
  // Get wallets
  getWallets();
  
  // Get assets
  getAssets();
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
      case 'wallet_updated_event':
        handleWalletUpdatedEvent(message);
        break;
      case 'asset_updated_event':
        handleAssetUpdatedEvent(message);
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
  
  if (data.wallets) {
    displayWallets(data.wallets);
    wallets = data.wallets;
    updateWalletSelects();
  }
  
  if (data.assets) {
    displayAssets(data.assets);
    assets = data.assets;
    updateAssetSelects();
  }
  
  if (data.balances) {
    displayAssetBalances(data.balances);
  }
  
  if (data.asset) {
    showAlert(`Criptoativo ${data.asset.name} (${data.asset.symbol}) criado com sucesso!`, 'success');
    getAssets();
  }
  
  if (data.success) {
    if (data.blockHash) {
      showAlert(`Operação concluída com sucesso! Hash do bloco: ${data.blockHash}`, 'success');
      
      if (data.token) {
        showAlert(`Token para descriptografia: ${data.token} (Guarde este token em um local seguro)`, 'info');
      }
      
      // Refresh blocks
      sendWebSocketMessage('get_blocks');
      
      // If wallet operation, refresh wallets
      if (data.walletOperation) {
        getWallets();
      }
    }
    
    if (data.wallet) {
      showAlert(`Carteira ${data.operation || 'atualizada'} com sucesso!`, 'success');
      
      // Se for uma carteira criada, mostra a seed phrase e a chave privada
      if (data.operation === 'criada' && data.wallet.mnemonic) {
        displaySeedPhrase(data.wallet.mnemonic, data.wallet.address, data.wallet.privateKey);
      }
      
      getWallets();
    }
    
    if (data.transaction && data.message) {
      showAlert(data.message, 'success');
      getAssets();
      getWallets();
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

// Get wallets from the server
function getWallets() {
  sendWebSocketMessage('get_wallets');
}

// Display wallets in the UI
function displayWallets(wallets) {
  if (!walletsContainerEl) return;
  
  walletsContainerEl.innerHTML = '';
  
  if (wallets.length === 0) {
    walletsContainerEl.innerHTML = '<p>Nenhuma carteira encontrada. Crie uma nova carteira para começar.</p>';
    return;
  }
  
  wallets.forEach(wallet => {
    const walletEl = document.createElement('div');
    walletEl.className = 'wallet-item';
    
    const createdAt = new Date(wallet.createdAt).toLocaleString();
    
    walletEl.innerHTML = `
      <div class="wallet-header">
        <span>${wallet.label}</span>
        <span>${createdAt}</span>
      </div>
      <div class="wallet-balance">${wallet.balance} NEB</div>
      <div class="wallet-address">${wallet.address}</div>
      <div class="wallet-item-actions">
        <button class="btn btn-secondary send-from-wallet" data-address="${wallet.address}">Enviar</button>
        <button class="btn btn-danger remove-wallet" data-address="${wallet.address}">Remover</button>
      </div>
    `;
    
    walletsContainerEl.appendChild(walletEl);
    
    // Add event listeners for wallet actions
    const sendBtn = walletEl.querySelector('.send-from-wallet');
    const removeBtn = walletEl.querySelector('.remove-wallet');
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        showSendTransactionForm(wallet.address);
      });
    }
    
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        removeWallet(wallet.address);
      });
    }
  });
}

// Update wallet select elements
function updateWalletSelects() {
  if (!walletFromEl || !walletToEl) return;
  
  // Clear existing options
  walletFromEl.innerHTML = '<option value="">Selecione uma carteira</option>';
  walletToEl.innerHTML = '<option value="">Selecione uma carteira</option>';
  
  // Add options for each wallet
  wallets.forEach(wallet => {
    const fromOption = document.createElement('option');
    fromOption.value = wallet.address;
    fromOption.textContent = `${wallet.label} (${wallet.balance} NEB) - ${wallet.address.substring(0, 10)}...`;
    walletFromEl.appendChild(fromOption);
    
    const toOption = document.createElement('option');
    toOption.value = wallet.address;
    toOption.textContent = `${wallet.label} - ${wallet.address.substring(0, 10)}...`;
    walletToEl.appendChild(toOption);
  });
}

// Show send transaction form
function showSendTransactionForm(fromAddress) {
  sendTransactionFormEl.classList.remove('hidden');
  createWalletFormEl.classList.add('hidden');
  importWalletFormEl.classList.add('hidden');
  
  // Set the from address if provided
  if (fromAddress && walletFromEl) {
    walletFromEl.value = fromAddress;
  }
}

// Handle create wallet form submission
function handleCreateWallet(event) {
  event.preventDefault();
  
  const label = document.getElementById('wallet-label').value;
  
  sendWebSocketMessage('create_wallet', {
    label
  });
  
  // Hide form
  createWalletFormEl.classList.add('hidden');
  
  // Reset form
  event.target.reset();
}

// Display seed phrase to the user
function displaySeedPhrase(mnemonic, address, privateKey) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'modal-content';
  
  modal.innerHTML = `
    <h2>Importante: Guarde suas Informações de Carteira!</h2>
    <p>Esta é a única vez que você verá estas informações. Guarde-as em um local seguro.</p>
    
    <h3>Seed Phrase</h3>
    <p>Você precisará da seed phrase para recuperar sua carteira caso perca o acesso.</p>
    <div class="seed-phrase">${mnemonic}</div>
    
    <h3>Chave Privada</h3>
    <p>Sua chave privada dá acesso total à sua carteira. Nunca compartilhe com ninguém!</p>
    <div class="private-key">${privateKey}</div>
    
    <h3>Endereço da Carteira</h3>
    <p><strong>${address}</strong></p>
    
    <button id="copy-seed" class="btn btn-secondary">Copiar Seed Phrase</button>
    <button id="copy-private-key" class="btn btn-secondary">Copiar Chave Privada</button>
    <button id="seed-confirm" class="btn btn-block">Eu guardei minhas informações</button>
  `;
  
  // Add modal to the page
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Add event listeners
  document.getElementById('copy-seed').addEventListener('click', () => {
    navigator.clipboard.writeText(mnemonic)
      .then(() => {
        showAlert('Seed phrase copiada para a área de transferência!', 'success');
      })
      .catch(err => {
        console.error('Erro ao copiar seed phrase:', err);
      });
  });
  
  document.getElementById('copy-private-key').addEventListener('click', () => {
    navigator.clipboard.writeText(privateKey)
      .then(() => {
        showAlert('Chave privada copiada para a área de transferência!', 'success');
      })
      .catch(err => {
        console.error('Erro ao copiar chave privada:', err);
      });
  });
  
  document.getElementById('seed-confirm').addEventListener('click', () => {
    overlay.remove();
  });
}

// Handle import wallet form submission
function handleImportWallet(event) {
  event.preventDefault();
  
  const privateKey = document.getElementById('wallet-private-key').value;
  const label = document.getElementById('wallet-import-label').value;
  
  sendWebSocketMessage('import_wallet', {
    privateKey,
    label
  });
  
  // Hide form
  importWalletFormEl.classList.add('hidden');
  
  // Reset form
  event.target.reset();
}

// Handle send transaction form submission
function handleSendTransaction(event) {
  event.preventDefault();
  
  const fromAddress = walletFromEl.value;
  const toAddress = walletToEl.value;
  const amount = parseFloat(document.getElementById('wallet-amount').value);
  
  if (!fromAddress || !toAddress) {
    showAlert('Por favor, selecione as carteiras de origem e destino.', 'warning');
    return;
  }
  
  if (isNaN(amount) || amount <= 0) {
    showAlert('Por favor, insira uma quantidade válida.', 'warning');
    return;
  }
  
  if (fromAddress === toAddress) {
    showAlert('As carteiras de origem e destino não podem ser as mesmas.', 'warning');
    return;
  }
  
  // Find the wallet to check balance
  const fromWallet = wallets.find(w => w.address === fromAddress);
  if (fromWallet && fromWallet.balance < amount) {
    showAlert(`Saldo insuficiente. Disponível: ${fromWallet.balance} NEB`, 'danger');
    return;
  }
  
  sendWebSocketMessage('send_transaction', {
    from: fromAddress,
    to: toAddress,
    amount
  });
  
  // Hide form
  sendTransactionFormEl.classList.add('hidden');
  
  // Reset form
  event.target.reset();
}

// Remove a wallet
function removeWallet(address) {
  if (confirm(`Tem certeza que deseja remover a carteira ${address}?`)) {
    sendWebSocketMessage('remove_wallet', {
      address
    });
  }
}

// Handle wallet updated event
function handleWalletUpdatedEvent(message) {
  showAlert('Carteiras atualizadas!', 'info');
  getWallets();
}

// Handle asset updated event
function handleAssetUpdatedEvent(message) {
  showAlert('Criptoativos atualizados!', 'info');
  getAssets();
  getWallets(); // Para atualizar os saldos
}

// Get assets from the server
function getAssets() {
  sendWebSocketMessage('get_assets');
}

// Get asset balances for an address
function getAssetBalances(address) {
  sendWebSocketMessage('get_asset_balances', { address });
}

// Display assets in the UI
function displayAssets(assets) {
  if (!assetsContainerEl) return;
  
  assetsContainerEl.innerHTML = '';
  
  if (assets.length === 0) {
    assetsContainerEl.innerHTML = '<p>Nenhum criptoativo encontrado. Crie um novo criptoativo para começar.</p>';
    return;
  }
  
  assets.forEach(asset => {
    const assetEl = document.createElement('div');
    assetEl.className = 'asset-item';
    
    const createdAt = new Date(asset.createdAt).toLocaleString();
    
    assetEl.innerHTML = `
      <div class="asset-header">
        <span>${asset.name}<span class="asset-symbol">${asset.symbol}</span></span>
        <span>${createdAt}</span>
      </div>
      <div class="asset-supply">Oferta Total: ${asset.totalSupply}</div>
      <div class="asset-description">${asset.description || 'Sem descrição'}</div>
      <div>Casas Decimais: ${asset.decimals}</div>
      <div>Criador: <span class="asset-creator">${asset.creator}</span></div>
      <div class="asset-item-actions">
        <button class="btn btn-secondary mint-asset" data-id="${asset.id}">Criar (Mint)</button>
        <button class="btn btn-secondary transfer-asset" data-id="${asset.id}">Transferir</button>
        <button class="btn btn-danger burn-asset" data-id="${asset.id}">Destruir (Burn)</button>
      </div>
    `;
    
    assetsContainerEl.appendChild(assetEl);
    
    // Add event listeners for asset actions
    const mintBtn = assetEl.querySelector('.mint-asset');
    const transferBtn = assetEl.querySelector('.transfer-asset');
    const burnBtn = assetEl.querySelector('.burn-asset');
    
    if (mintBtn) {
      mintBtn.addEventListener('click', () => {
        showMintAssetForm(asset.id);
      });
    }
    
    if (transferBtn) {
      transferBtn.addEventListener('click', () => {
        showTransferAssetForm(asset.id);
      });
    }
    
    if (burnBtn) {
      burnBtn.addEventListener('click', () => {
        showBurnAssetForm(asset.id);
      });
    }
  });
}

// Display asset balances in the UI
function displayAssetBalances(balances) {
  // Implementação futura
}

// Update asset select elements
function updateAssetSelects() {
  // Update creator select
  if (assetCreatorEl) {
    assetCreatorEl.innerHTML = '<option value="">Selecione uma carteira</option>';
    wallets.forEach(wallet => {
      const option = document.createElement('option');
      option.value = wallet.address;
      option.textContent = `${wallet.label} - ${wallet.address.substring(0, 10)}...`;
      assetCreatorEl.appendChild(option);
    });
  }
  
  // Update mint asset selects
  if (mintAssetIdEl && mintToAddressEl) {
    mintAssetIdEl.innerHTML = '<option value="">Selecione um criptoativo</option>';
    assets.forEach(asset => {
      const option = document.createElement('option');
      option.value = asset.id;
      option.textContent = `${asset.name} (${asset.symbol})`;
      mintAssetIdEl.appendChild(option);
    });
    
    mintToAddressEl.innerHTML = '<option value="">Selecione uma carteira</option>';
    wallets.forEach(wallet => {
      const option = document.createElement('option');
      option.value = wallet.address;
      option.textContent = `${wallet.label} - ${wallet.address.substring(0, 10)}...`;
      mintToAddressEl.appendChild(option);
    });
  }
  
  // Update transfer asset selects
  if (transferAssetIdEl && transferFromAddressEl && transferToAddressEl) {
    transferAssetIdEl.innerHTML = '<option value="">Selecione um criptoativo</option>';
    assets.forEach(asset => {
      const option = document.createElement('option');
      option.value = asset.id;
      option.textContent = `${asset.name} (${asset.symbol})`;
      transferAssetIdEl.appendChild(option);
    });
    
    transferFromAddressEl.innerHTML = '<option value="">Selecione uma carteira</option>';
    transferToAddressEl.innerHTML = '<option value="">Selecione uma carteira</option>';
    
    wallets.forEach(wallet => {
      const fromOption = document.createElement('option');
      fromOption.value = wallet.address;
      fromOption.textContent = `${wallet.label} - ${wallet.address.substring(0, 10)}...`;
      transferFromAddressEl.appendChild(fromOption);
      
      const toOption = document.createElement('option');
      toOption.value = wallet.address;
      toOption.textContent = `${wallet.label} - ${wallet.address.substring(0, 10)}...`;
      transferToAddressEl.appendChild(toOption);
    });
  }
  
  // Update burn asset selects
  if (burnAssetIdEl && burnFromAddressEl) {
    burnAssetIdEl.innerHTML = '<option value="">Selecione um criptoativo</option>';
    assets.forEach(asset => {
      const option = document.createElement('option');
      option.value = asset.id;
      option.textContent = `${asset.name} (${asset.symbol})`;
      burnAssetIdEl.appendChild(option);
    });
    
    burnFromAddressEl.innerHTML = '<option value="">Selecione uma carteira</option>';
    wallets.forEach(wallet => {
      const option = document.createElement('option');
      option.value = wallet.address;
      option.textContent = `${wallet.label} - ${wallet.address.substring(0, 10)}...`;
      burnFromAddressEl.appendChild(option);
    });
  }
}

// Show mint asset form
function showMintAssetForm(assetId) {
  mintAssetFormEl.classList.remove('hidden');
  createAssetFormEl.classList.add('hidden');
  transferAssetFormEl.classList.add('hidden');
  burnAssetFormEl.classList.add('hidden');
  
  updateAssetSelects();
  
  // Set the asset ID if provided
  if (assetId && mintAssetIdEl) {
    mintAssetIdEl.value = assetId;
  }
}

// Show transfer asset form
function showTransferAssetForm(assetId) {
  transferAssetFormEl.classList.remove('hidden');
  createAssetFormEl.classList.add('hidden');
  mintAssetFormEl.classList.add('hidden');
  burnAssetFormEl.classList.add('hidden');
  
  updateAssetSelects();
  
  // Set the asset ID if provided
  if (assetId && transferAssetIdEl) {
    transferAssetIdEl.value = assetId;
  }
}

// Show burn asset form
function showBurnAssetForm(assetId) {
  burnAssetFormEl.classList.remove('hidden');
  createAssetFormEl.classList.add('hidden');
  mintAssetFormEl.classList.add('hidden');
  transferAssetFormEl.classList.add('hidden');
  
  updateAssetSelects();
  
  // Set the asset ID if provided
  if (assetId && burnAssetIdEl) {
    burnAssetIdEl.value = assetId;
  }
}

// Handle create asset form submission
function handleCreateAsset(event) {
  event.preventDefault();
  
  const name = document.getElementById('asset-name').value;
  const symbol = document.getElementById('asset-symbol').value;
  const decimals = parseInt(document.getElementById('asset-decimals').value);
  const totalSupply = parseInt(document.getElementById('asset-total-supply').value);
  const description = document.getElementById('asset-description').value;
  const creatorAddress = document.getElementById('asset-creator').value;
  
  if (!name || !symbol) {
    showAlert('Por favor, preencha o nome e o símbolo do criptoativo.', 'warning');
    return;
  }
  
  if (!creatorAddress) {
    showAlert('Por favor, selecione uma carteira para o criador.', 'warning');
    return;
  }
  
  sendWebSocketMessage('create_asset', {
    name,
    symbol,
    decimals,
    totalSupply,
    description,
    creatorAddress
  });
  
  // Hide form
  createAssetFormEl.classList.add('hidden');
  
  // Reset form
  event.target.reset();
}

// Handle mint asset form submission
function handleMintAsset(event) {
  event.preventDefault();
  
  const assetId = document.getElementById('mint-asset-id').value;
  const toAddress = document.getElementById('mint-to-address').value;
  const amount = parseInt(document.getElementById('mint-amount').value);
  
  if (!assetId || !toAddress) {
    showAlert('Por favor, selecione um criptoativo e uma carteira de destino.', 'warning');
    return;
  }
  
  if (isNaN(amount) || amount <= 0) {
    showAlert('Por favor, insira uma quantidade válida.', 'warning');
    return;
  }
  
  sendWebSocketMessage('mint_asset', {
    assetId,
    toAddress,
    amount
  });
  
  // Hide form
  mintAssetFormEl.classList.add('hidden');
  
  // Reset form
  event.target.reset();
}

// Handle transfer asset form submission
function handleTransferAsset(event) {
  event.preventDefault();
  
  const assetId = document.getElementById('transfer-asset-id').value;
  const fromAddress = document.getElementById('transfer-from-address').value;
  const toAddress = document.getElementById('transfer-to-address').value;
  const amount = parseFloat(document.getElementById('transfer-amount').value);
  
  if (!assetId || !fromAddress || !toAddress) {
    showAlert('Por favor, preencha todos os campos.', 'warning');
    return;
  }
  
  if (isNaN(amount) || amount <= 0) {
    showAlert('Por favor, insira uma quantidade válida.', 'warning');
    return;
  }
  
  if (fromAddress === toAddress) {
    showAlert('As carteiras de origem e destino não podem ser as mesmas.', 'warning');
    return;
  }
  
  sendWebSocketMessage('transfer_asset', {
    assetId,
    fromAddress,
    toAddress,
    amount
  });
  
  // Hide form
  transferAssetFormEl.classList.add('hidden');
  
  // Reset form
  event.target.reset();
}

// Handle burn asset form submission
function handleBurnAsset(event) {
  event.preventDefault();
  
  const assetId = document.getElementById('burn-asset-id').value;
  const fromAddress = document.getElementById('burn-from-address').value;
  const amount = parseFloat(document.getElementById('burn-amount').value);
  
  if (!assetId || !fromAddress) {
    showAlert('Por favor, selecione um criptoativo e uma carteira.', 'warning');
    return;
  }
  
  if (isNaN(amount) || amount <= 0) {
    showAlert('Por favor, insira uma quantidade válida.', 'warning');
    return;
  }
  
  sendWebSocketMessage('burn_asset', {
    assetId,
    fromAddress,
    amount
  });
  
  // Hide form
  burnAssetFormEl.classList.add('hidden');
  
  // Reset form
  event.target.reset();
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
