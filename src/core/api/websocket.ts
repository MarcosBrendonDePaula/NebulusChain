/**
 * WebSocket.ts
 * Implementa um servidor WebSocket para interação com a blockchain
 */

import { WebSocketServer } from 'ws';
import { Blockchain } from '../blockchain/blockchain';
import { BlockData } from '../blockchain/block';
import { Identity } from '../identity/identity';
import { Storage } from '../storage/storage';
import { Node, MessageType } from '../p2p/node';
import { encrypt, decrypt } from '../encryption/encrypt';
import { WalletManager } from '../wallet/wallet';
import { AssetManager } from '../asset/asset';
import * as fs from 'fs';
import * as path from 'path';

// Tipos de mensagens WebSocket
export enum WSMessageType {
  // Comandos de consulta
  GET_BLOCKS = 'get_blocks',
  GET_BLOCK = 'get_block',
  GET_PEERS = 'get_peers',
  GET_NODE_INFO = 'get_node_info',
  GET_WALLETS = 'get_wallets',
  GET_ASSETS = 'get_assets',
  GET_ASSET = 'get_asset',
  GET_ASSET_BALANCES = 'get_asset_balances',
  
  // Comandos de ação
  ADD_TRANSACTION = 'add_transaction',
  ADD_FILE = 'add_file',
  DECRYPT_PAYLOAD = 'decrypt_payload',
  CONNECT_PEER = 'connect_peer',
  SYNC_BLOCKCHAIN = 'sync_blockchain',
  VALIDATE_BLOCK = 'validate_block',
  
  // Comandos de carteira
  CREATE_WALLET = 'create_wallet',
  IMPORT_WALLET = 'import_wallet',
  SEND_TRANSACTION = 'send_transaction',
  UPDATE_WALLET_BALANCES = 'update_wallet_balances',
  REMOVE_WALLET = 'remove_wallet',
  
  // Comandos de criptoativos
  CREATE_ASSET = 'create_asset',
  MINT_ASSET = 'mint_asset',
  TRANSFER_ASSET = 'transfer_asset',
  BURN_ASSET = 'burn_asset',
  
  // Respostas
  RESPONSE = 'response',
  ERROR = 'error',
  
  // Eventos
  NEW_BLOCK_EVENT = 'new_block_event',
  PEER_CONNECTED_EVENT = 'peer_connected_event',
  PEER_DISCONNECTED_EVENT = 'peer_disconnected_event',
  SYNC_COMPLETED_EVENT = 'sync_completed_event',
  VALIDATION_RESULT_EVENT = 'validation_result_event',
  WALLET_UPDATED_EVENT = 'wallet_updated_event',
  ASSET_UPDATED_EVENT = 'asset_updated_event'
}

// Interface para mensagens WebSocket
export interface WSMessage {
  type: WSMessageType;
  data?: any;
  requestId?: string;
}

/**
 * Classe que implementa um servidor WebSocket para interação com a blockchain
 */
export class WebSocketAPI {
  private wss: WebSocketServer;
  private blockchain: Blockchain;
  private identity: Identity;
  private storage: Storage;
  private node: Node;
  private walletManager: WalletManager;
  private assetManager: AssetManager;
  private clients: Set<any> = new Set();
  private validations: Map<string, any[]> = new Map();
  
  /**
   * Construtor da classe WebSocketAPI
   * @param port Porta para o servidor WebSocket
   * @param blockchain Instância da blockchain
   * @param identity Instância da identidade
   * @param storage Instância do armazenamento
   * @param node Instância do nó P2P
   */
  constructor(
    port: number,
    blockchain: Blockchain,
    identity: Identity,
    storage: Storage,
    node: Node
  ) {
    this.blockchain = blockchain;
    this.identity = identity;
    this.storage = storage;
    this.node = node;
    
    // Inicializa o gerenciador de carteiras
    this.walletManager = new WalletManager('./data/wallets');
    this.walletManager.initialize();
    
    // Inicializa o gerenciador de criptoativos
    this.assetManager = new AssetManager('./data/assets', identity, blockchain);
    this.assetManager.initialize();
    
    // Cria o servidor WebSocket
    this.wss = new WebSocketServer({ port });
    
    // Configura os eventos do servidor
    this.setupServerEvents();
    
    // Configura os eventos do nó P2P
    this.setupNodeEvents();
    
    console.log(`Servidor WebSocket iniciado na porta ${port}`);
  }
  
  /**
   * Configura os eventos do servidor WebSocket
   */
  private setupServerEvents(): void {
    // Evento de conexão
    this.wss.on('connection', (ws) => {
      console.log('Nova conexão WebSocket estabelecida');
      this.clients.add(ws);
      
      // Evento de mensagem
      ws.on('message', (message) => {
        try {
          const parsedMessage = JSON.parse(message.toString()) as WSMessage;
          this.handleMessage(parsedMessage, ws);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
          this.sendError(ws, 'Formato de mensagem inválido', undefined);
        }
      });
      
      // Evento de fechamento
      ws.on('close', () => {
        console.log('Conexão WebSocket fechada');
        this.clients.delete(ws);
      });
      
      // Evento de erro
      ws.on('error', (error) => {
        console.error('Erro na conexão WebSocket:', error);
        this.clients.delete(ws);
      });
    });
  }
  
  /**
   * Configura os eventos do nó P2P
   */
  private setupNodeEvents(): void {
    // Evento de novo bloco
    this.node.on(MessageType.NEW_BLOCK, (data) => {
      this.broadcastEvent(WSMessageType.NEW_BLOCK_EVENT, data);
    });
    
    // Evento de peer conectado
    this.node.on('peer:connected', (data) => {
      this.broadcastEvent(WSMessageType.PEER_CONNECTED_EVENT, data);
    });
    
    // Evento de peer desconectado
    this.node.on('peer:disconnected', (data) => {
      this.broadcastEvent(WSMessageType.PEER_DISCONNECTED_EVENT, data);
    });
  }
  
  /**
   * Processa uma mensagem recebida
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleMessage(message: WSMessage, ws: any): Promise<void> {
    try {
      switch (message.type) {
        case WSMessageType.GET_BLOCKS:
          this.handleGetBlocks(message, ws);
          break;
          
        case WSMessageType.GET_BLOCK:
          this.handleGetBlock(message, ws);
          break;
          
        case WSMessageType.GET_PEERS:
          this.handleGetPeers(message, ws);
          break;
          
        case WSMessageType.GET_NODE_INFO:
          this.handleGetNodeInfo(message, ws);
          break;
          
        case WSMessageType.ADD_TRANSACTION:
          await this.handleAddTransaction(message, ws);
          break;
          
        case WSMessageType.ADD_FILE:
          await this.handleAddFile(message, ws);
          break;
          
        case WSMessageType.DECRYPT_PAYLOAD:
          this.handleDecryptPayload(message, ws);
          break;
          
        case WSMessageType.CONNECT_PEER:
          await this.handleConnectPeer(message, ws);
          break;
          
        case WSMessageType.SYNC_BLOCKCHAIN:
          await this.handleSyncBlockchain(message, ws);
          break;
          
        case WSMessageType.VALIDATE_BLOCK:
          await this.handleValidateBlock(message, ws);
          break;
          
        // Comandos de carteira
        case WSMessageType.GET_WALLETS:
          this.handleGetWallets(message, ws);
          break;
          
        case WSMessageType.CREATE_WALLET:
          await this.handleCreateWallet(message, ws);
          break;
          
        case WSMessageType.IMPORT_WALLET:
          this.handleImportWallet(message, ws);
          break;
          
        case WSMessageType.SEND_TRANSACTION:
          await this.handleSendWalletTransaction(message, ws);
          break;
          
        case WSMessageType.UPDATE_WALLET_BALANCES:
          this.handleUpdateWalletBalances(message, ws);
          break;
          
        case WSMessageType.REMOVE_WALLET:
          this.handleRemoveWallet(message, ws);
          break;
          
        // Comandos de criptoativos
        case WSMessageType.GET_ASSETS:
          this.handleGetAssets(message, ws);
          break;
          
        case WSMessageType.GET_ASSET:
          this.handleGetAsset(message, ws);
          break;
          
        case WSMessageType.GET_ASSET_BALANCES:
          this.handleGetAssetBalances(message, ws);
          break;
          
        case WSMessageType.CREATE_ASSET:
          await this.handleCreateAsset(message, ws);
          break;
          
        case WSMessageType.MINT_ASSET:
          await this.handleMintAsset(message, ws);
          break;
          
        case WSMessageType.TRANSFER_ASSET:
          await this.handleTransferAsset(message, ws);
          break;
          
        case WSMessageType.BURN_ASSET:
          await this.handleBurnAsset(message, ws);
          break;
          
        default:
          this.sendError(ws, `Tipo de mensagem desconhecido: ${message.type}`, message.requestId);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      this.sendError(ws, `Erro ao processar mensagem: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para obter todos os blocos
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetBlocks(message: WSMessage, ws: any): void {
    const blocks = this.blockchain.getAllBlocks();
    this.sendResponse(ws, { blocks }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para obter um bloco específico
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetBlock(message: WSMessage, ws: any): void {
    if (!message.data || !message.data.hash) {
      this.sendError(ws, 'Hash do bloco não fornecido', message.requestId);
      return;
    }
    
    const block = this.blockchain.getBlockByHash(message.data.hash);
    
    if (!block) {
      this.sendError(ws, `Bloco com hash ${message.data.hash} não encontrado`, message.requestId);
      return;
    }
    
    this.sendResponse(ws, { block }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para obter os peers conectados
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetPeers(message: WSMessage, ws: any): void {
    const connectedPeers = this.node.getConnectedPeers();
    const bootstrapNodes = this.node.getBootstrapNodes();
    
    this.sendResponse(ws, { connectedPeers, bootstrapNodes }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para obter informações do nó
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetNodeInfo(message: WSMessage, ws: any): void {
    const nodeInfo = {
      nodeId: this.node.getNodeId(),
      publicKey: this.identity.getPublicKey(),
      isActive: this.node.isActive(),
      port: this.node.getPort(),
      blockchainLength: this.blockchain.getAllBlocks().length
    };
    
    this.sendResponse(ws, { nodeInfo }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para adicionar uma transação
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleAddTransaction(message: WSMessage, ws: any): Promise<void> {
    if (!message.data || !message.data.transaction) {
      this.sendError(ws, 'Dados da transação não fornecidos', message.requestId);
      return;
    }
    
    try {
      const transaction = message.data.transaction;
      
      // Verifica se a transação tem a estrutura esperada
      if (!transaction.type || !transaction.payload) {
        this.sendError(ws, 'Formato de transação inválido. A transação deve conter "type" e "payload".', message.requestId);
        return;
      }
      
      // Assina os dados
      const dataToSign = JSON.stringify(transaction.payload);
      const signature = this.identity.sign(dataToSign);
      
      // Prepara os dados para o bloco
      const blockData: BlockData = {
        type: transaction.type,
        payload: transaction.payload,
        encryption: transaction.encryption,
        signatures: [{
          publicKey: this.identity.getPublicKey(),
          signature
        }],
        requiredSigners: transaction.requiredSigners || 1
      };
      
      // Adiciona o bloco à blockchain
      const newBlock = this.blockchain.addBlock(blockData);
      
      // Broadcast do novo bloco
      await this.node.broadcast(MessageType.NEW_BLOCK, {
        blockHash: newBlock.hash
      });
      
      this.sendResponse(ws, { 
        success: true, 
        blockHash: newBlock.hash,
        message: 'Transação adicionada com sucesso'
      }, message.requestId);
      
    } catch (error) {
      this.sendError(ws, `Erro ao adicionar transação: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para adicionar um arquivo
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleAddFile(message: WSMessage, ws: any): Promise<void> {
    if (!message.data || !message.data.fileContent || !message.data.fileName) {
      this.sendError(ws, 'Conteúdo ou nome do arquivo não fornecido', message.requestId);
      return;
    }
    
    try {
      const { fileContent, fileName, shouldEncrypt } = message.data;
      
      // Decodifica o conteúdo do arquivo de base64
      const fileBuffer = Buffer.from(fileContent, 'base64');
      
      // Cria um arquivo temporário
      const tempDir = path.join('./data', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, fileName);
      fs.writeFileSync(tempFilePath, fileBuffer);
      
      // Armazena o arquivo e obtém o hash
      const fileHash = this.storage.storeFile(tempFilePath);
      
      // Remove o arquivo temporário
      fs.unlinkSync(tempFilePath);
      
      // Prepara os dados para o bloco
      let payload: any = {
        fileName: fileName,
        fileHash: fileHash,
        fileSize: fileBuffer.length,
        timestamp: Date.now()
      };
      
      // Criptografa o payload se necessário
      let encryptionInfo = undefined;
      let token = undefined;
      
      if (shouldEncrypt) {
        const encryptedResult = encrypt(payload);
        payload = encryptedResult.encryptedData;
        encryptionInfo = {
          method: 'AES-256-CBC' as const,
          iv: encryptedResult.iv,
          encrypted: true
        };
        token = encryptedResult.token;
      }
      
      // Assina os dados
      const dataToSign = JSON.stringify(payload);
      const signature = this.identity.sign(dataToSign);
      
      // Cria o bloco
      const blockData: BlockData = {
        type: 'file',
        payload,
        encryption: encryptionInfo,
        signatures: [{
          publicKey: this.identity.getPublicKey(),
          signature
        }],
        requiredSigners: 1
      };
      
      // Adiciona o bloco à blockchain
      const newBlock = this.blockchain.addBlock(blockData);
      
      // Broadcast do novo bloco
      await this.node.broadcast(MessageType.NEW_BLOCK, {
        blockHash: newBlock.hash
      });
      
      this.sendResponse(ws, { 
        success: true, 
        blockHash: newBlock.hash,
        fileHash: fileHash,
        token: token,
        message: 'Arquivo adicionado com sucesso'
      }, message.requestId);
      
    } catch (error) {
      this.sendError(ws, `Erro ao adicionar arquivo: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para descriptografar um payload
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleDecryptPayload(message: WSMessage, ws: any): void {
    if (!message.data || !message.data.token) {
      this.sendError(ws, 'Token não fornecido', message.requestId);
      return;
    }
    
    try {
      const { token, blockHash } = message.data;
      let blocks;
      
      if (blockHash) {
        const block = this.blockchain.getBlockByHash(blockHash);
        if (!block) {
          this.sendError(ws, `Bloco com hash ${blockHash} não encontrado`, message.requestId);
          return;
        }
        blocks = [block];
      } else {
        blocks = this.blockchain.getAllBlocks().filter(block => block.data.encryption);
      }
      
      if (blocks.length === 0) {
        this.sendError(ws, 'Nenhum bloco criptografado encontrado', message.requestId);
        return;
      }
      
      let decryptedBlocks = [];
      
      for (const block of blocks) {
        if (!block.data.encryption) continue;
        
        try {
          const decrypted = decrypt(
            block.data.payload as string,
            block.data.encryption.iv,
            token
          );
          
          decryptedBlocks.push({
            blockHash: block.hash,
            decryptedData: JSON.parse(decrypted)
          });
        } catch (error) {
          // Se não conseguir descriptografar, apenas ignora este bloco
        }
      }
      
      if (decryptedBlocks.length === 0) {
        this.sendError(ws, 'Não foi possível descriptografar nenhum bloco com o token fornecido', message.requestId);
        return;
      }
      
      this.sendResponse(ws, { decryptedBlocks }, message.requestId);
      
    } catch (error) {
      this.sendError(ws, `Erro ao descriptografar payload: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para conectar a um peer
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleConnectPeer(message: WSMessage, ws: any): Promise<void> {
    if (!message.data || !message.data.address) {
      this.sendError(ws, 'Endereço do peer não fornecido', message.requestId);
      return;
    }
    
    try {
      const { address } = message.data;
      
      await this.node.connectToPeer(address);
      
      this.sendResponse(ws, { 
        success: true, 
        message: `Conectado ao peer: ${address}`
      }, message.requestId);
      
    } catch (error) {
      this.sendError(ws, `Erro ao conectar ao peer: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para sincronizar a blockchain
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleSyncBlockchain(message: WSMessage, ws: any): Promise<void> {
    try {
      await this.node.syncBlockchain(this.blockchain);
      
      this.sendResponse(ws, { 
        success: true, 
        message: 'Solicitação de sincronização enviada'
      }, message.requestId);
      
      // Simula o evento de sincronização concluída após 2 segundos
      setTimeout(() => {
        this.broadcastEvent(WSMessageType.SYNC_COMPLETED_EVENT, {
          success: true,
          blocksAdded: 0
        });
      }, 2000);
      
    } catch (error) {
      this.sendError(ws, `Erro ao sincronizar blockchain: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para validar um bloco
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleValidateBlock(message: WSMessage, ws: any): Promise<void> {
    if (!message.data || !message.data.blockHash) {
      this.sendError(ws, 'Hash do bloco não fornecido', message.requestId);
      return;
    }
    
    try {
      const { blockHash } = message.data;
      
      const block = this.blockchain.getBlockByHash(blockHash);
      if (!block) {
        this.sendError(ws, `Bloco com hash ${blockHash} não encontrado`, message.requestId);
        return;
      }
      
      await this.node.requestBlockValidation(block);
      
      this.sendResponse(ws, { 
        success: true, 
        message: `Solicitação de validação enviada para o bloco ${blockHash}`
      }, message.requestId);
      
      // Simula o evento de validação concluída após 2 segundos
      setTimeout(() => {
        const consensusResult = {
          blockHash,
          validations: [
            { status: 'valid', blockHash },
            { status: 'valid', blockHash },
            { status: 'valid', blockHash }
          ],
          accepted: true
        };
        
        this.broadcastEvent(WSMessageType.VALIDATION_RESULT_EVENT, consensusResult);
      }, 2000);
      
    } catch (error) {
      this.sendError(ws, `Erro ao validar bloco: ${error}`, message.requestId);
    }
  }
  
  /**
   * Envia uma resposta para um cliente
   * @param ws Conexão WebSocket
   * @param data Dados da resposta
   * @param requestId ID da requisição
   */
  private sendResponse(ws: any, data: any, requestId?: string): void {
    const response: WSMessage = {
      type: WSMessageType.RESPONSE,
      data,
      requestId
    };
    
    ws.send(JSON.stringify(response));
  }
  
  /**
   * Envia uma mensagem de erro para um cliente
   * @param ws Conexão WebSocket
   * @param errorMessage Mensagem de erro
   * @param requestId ID da requisição
   */
  private sendError(ws: any, errorMessage: string, requestId?: string): void {
    const response: WSMessage = {
      type: WSMessageType.ERROR,
      data: { error: errorMessage },
      requestId
    };
    
    ws.send(JSON.stringify(response));
  }
  
  /**
   * Envia um evento para todos os clientes conectados
   * @param eventType Tipo do evento
   * @param data Dados do evento
   */
  private broadcastEvent(eventType: WSMessageType, data: any): void {
    const event: WSMessage = {
      type: eventType,
      data
    };
    
    const message = JSON.stringify(event);
    
    this.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
  }
  
  /**
   * Processa uma solicitação para obter todas as carteiras
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetWallets(message: WSMessage, ws: any): void {
    const wallets = this.walletManager.getAllWallets();
    
    // Não enviar a chave privada para o cliente
    const safeWallets = wallets.map(wallet => ({
      address: wallet.address,
      label: wallet.label,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
      publicKey: wallet.publicKey
    }));
    
    this.sendResponse(ws, { wallets: safeWallets }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para criar uma nova carteira
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleCreateWallet(message: WSMessage, ws: any): Promise<void> {
    try {
      const { label } = message.data || { label: 'Minha Carteira' };
      
      // Cria a carteira
      const wallet = await this.walletManager.createWallet(label);
      
      // Registra a criação da carteira na blockchain
      const walletCreationData: BlockData = {
        type: 'wallet_creation',
        payload: {
          address: wallet.address,
          label: wallet.label,
          publicKey: wallet.publicKey,
          timestamp: wallet.createdAt
        },
        signatures: [{
          publicKey: this.identity.getPublicKey(),
          signature: this.identity.sign(JSON.stringify({
            address: wallet.address,
            label: wallet.label,
            publicKey: wallet.publicKey,
            timestamp: wallet.createdAt
          }))
        }],
        requiredSigners: 1
      };
      
      // Adiciona a transação ao pool
      this.blockchain.addTransaction(walletCreationData);
      
      // Versão segura da carteira (sem chave privada)
      const safeWallet = {
        address: wallet.address,
        label: wallet.label,
        balance: wallet.balance,
        createdAt: wallet.createdAt,
        publicKey: wallet.publicKey
      };
      
      this.sendResponse(ws, { 
        success: true, 
        wallet: safeWallet,
        operation: 'criada',
        walletOperation: true,
        message: 'Carteira criada com sucesso'
      }, message.requestId);
      
      // Broadcast do evento de atualização de carteira
      this.broadcastEvent(WSMessageType.WALLET_UPDATED_EVENT, {
        type: 'created',
        address: wallet.address
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao criar carteira: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para importar uma carteira
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleImportWallet(message: WSMessage, ws: any): void {
    try {
      if (!message.data || !message.data.privateKey) {
        this.sendError(ws, 'Chave privada não fornecida', message.requestId);
        return;
      }
      
      const { privateKey, label } = message.data;
      
      // Importa a carteira
      const wallet = this.walletManager.importWallet(privateKey, label || 'Carteira Importada');
      
      // Registra a importação da carteira na blockchain
      const walletImportData: BlockData = {
        type: 'wallet_import',
        payload: {
          address: wallet.address,
          label: wallet.label,
          publicKey: wallet.publicKey,
          timestamp: Date.now()
        },
        signatures: [{
          publicKey: this.identity.getPublicKey(),
          signature: this.identity.sign(JSON.stringify({
            address: wallet.address,
            label: wallet.label,
            publicKey: wallet.publicKey,
            timestamp: Date.now()
          }))
        }],
        requiredSigners: 1
      };
      
      // Adiciona a transação ao pool
      this.blockchain.addTransaction(walletImportData);
      
      // Versão segura da carteira (sem chave privada)
      const safeWallet = {
        address: wallet.address,
        label: wallet.label,
        balance: wallet.balance,
        createdAt: wallet.createdAt,
        publicKey: wallet.publicKey
      };
      
      this.sendResponse(ws, { 
        success: true, 
        wallet: safeWallet,
        operation: 'importada',
        walletOperation: true,
        message: 'Carteira importada com sucesso'
      }, message.requestId);
      
      // Broadcast do evento de atualização de carteira
      this.broadcastEvent(WSMessageType.WALLET_UPDATED_EVENT, {
        type: 'imported',
        address: wallet.address
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao importar carteira: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para enviar uma transação entre carteiras
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleSendWalletTransaction(message: WSMessage, ws: any): Promise<void> {
    try {
      if (!message.data || !message.data.from || !message.data.to || message.data.amount === undefined) {
        this.sendError(ws, 'Dados da transação incompletos', message.requestId);
        return;
      }
      
      const { from, to, amount } = message.data;
      
      // Verifica se as carteiras existem
      const fromWallet = this.walletManager.getWallet(from);
      if (!fromWallet) {
        this.sendError(ws, `Carteira de origem não encontrada: ${from}`, message.requestId);
        return;
      }
      
      if (!this.walletManager.isValidAddress(to) && !this.walletManager.getWallet(to)) {
        this.sendError(ws, `Carteira de destino inválida: ${to}`, message.requestId);
        return;
      }
      
      // Verifica se a carteira tem saldo suficiente
      if (fromWallet.balance < amount) {
        this.sendError(ws, `Saldo insuficiente. Disponível: ${fromWallet.balance}, Necessário: ${amount}`, message.requestId);
        return;
      }
      
      // Cria a transação
      const transaction = this.walletManager.createTransaction(from, to, amount);
      
      // Cria o BlockData para a blockchain
      const blockData: BlockData = {
        type: 'transaction',
        payload: transaction,
        signatures: [{
          publicKey: fromWallet.publicKey,
          signature: transaction.signature!
        }],
        requiredSigners: 1
      };
      
      // Adiciona a transação ao pool
      this.blockchain.addTransaction(blockData);
      
      // Atualiza os saldos das carteiras
      this.walletManager.calculateBalances(this.blockchain);
      
      this.sendResponse(ws, { 
        success: true, 
        transaction,
        walletOperation: true,
        message: 'Transação enviada com sucesso'
      }, message.requestId);
      
      // Broadcast do evento de atualização de carteira
      this.broadcastEvent(WSMessageType.WALLET_UPDATED_EVENT, {
        type: 'transaction',
        from,
        to,
        amount
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao enviar transação: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para atualizar os saldos das carteiras
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleUpdateWalletBalances(message: WSMessage, ws: any): void {
    try {
      // Atualiza os saldos das carteiras
      this.walletManager.calculateBalances(this.blockchain);
      
      this.sendResponse(ws, { 
        success: true, 
        message: 'Saldos das carteiras atualizados com sucesso'
      }, message.requestId);
      
      // Broadcast do evento de atualização de carteira
      this.broadcastEvent(WSMessageType.WALLET_UPDATED_EVENT, {
        type: 'balances_updated'
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao atualizar saldos das carteiras: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para remover uma carteira
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleRemoveWallet(message: WSMessage, ws: any): void {
    try {
      if (!message.data || !message.data.address) {
        this.sendError(ws, 'Endereço da carteira não fornecido', message.requestId);
        return;
      }
      
      const { address } = message.data;
      
      // Verifica se a carteira existe
      const wallet = this.walletManager.getWallet(address);
      if (!wallet) {
        this.sendError(ws, `Carteira não encontrada: ${address}`, message.requestId);
        return;
      }
      
      // Registra a remoção da carteira na blockchain
      const walletRemovalData: BlockData = {
        type: 'wallet_removal',
        payload: {
          address: wallet.address,
          label: wallet.label,
          timestamp: Date.now()
        },
        signatures: [{
          publicKey: this.identity.getPublicKey(),
          signature: this.identity.sign(JSON.stringify({
            address: wallet.address,
            label: wallet.label,
            timestamp: Date.now()
          }))
        }],
        requiredSigners: 1
      };
      
      // Adiciona a transação ao pool
      this.blockchain.addTransaction(walletRemovalData);
      
      // Remove a carteira
      const removed = this.walletManager.removeWallet(address);
      
      if (removed) {
        this.sendResponse(ws, { 
          success: true, 
          address,
          walletOperation: true,
          operation: 'removida',
          message: `Carteira removida com sucesso: ${address}`
        }, message.requestId);
        
        // Broadcast do evento de atualização de carteira
        this.broadcastEvent(WSMessageType.WALLET_UPDATED_EVENT, {
          type: 'removed',
          address
        });
      } else {
        this.sendError(ws, `Erro ao remover carteira: ${address}`, message.requestId);
      }
      
    } catch (error) {
      this.sendError(ws, `Erro ao remover carteira: ${error}`, message.requestId);
    }
  }

  /**
   * Processa uma solicitação para obter todos os criptoativos
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetAssets(message: WSMessage, ws: any): void {
    const assets = this.assetManager.getAllAssets();
    this.sendResponse(ws, { assets }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para obter um criptoativo específico
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetAsset(message: WSMessage, ws: any): void {
    if (!message.data || !message.data.id) {
      this.sendError(ws, 'ID do criptoativo não fornecido', message.requestId);
      return;
    }
    
    const asset = this.assetManager.getAsset(message.data.id);
    
    if (!asset) {
      this.sendError(ws, `Criptoativo com ID ${message.data.id} não encontrado`, message.requestId);
      return;
    }
    
    this.sendResponse(ws, { asset }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para obter os saldos de criptoativos de um endereço
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private handleGetAssetBalances(message: WSMessage, ws: any): void {
    if (!message.data || !message.data.address) {
      this.sendError(ws, 'Endereço não fornecido', message.requestId);
      return;
    }
    
    const { address } = message.data;
    
    // Obtém os saldos
    const balancesMap = this.assetManager.getBalances(address);
    
    // Converte o mapa para um array de objetos
    const balances = Array.from(balancesMap.entries()).map(([assetId, balance]) => {
      const asset = this.assetManager.getAsset(assetId);
      return {
        assetId,
        symbol: asset ? asset.symbol : 'UNKNOWN',
        name: asset ? asset.name : 'Unknown Asset',
        balance
      };
    });
    
    this.sendResponse(ws, { balances }, message.requestId);
  }
  
  /**
   * Processa uma solicitação para criar um novo criptoativo
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleCreateAsset(message: WSMessage, ws: any): Promise<void> {
    try {
      if (!message.data) {
        this.sendError(ws, 'Dados do criptoativo não fornecidos', message.requestId);
        return;
      }
      
      const { 
        name, 
        symbol, 
        decimals, 
        totalSupply, 
        description, 
        creatorAddress,
        metadata 
      } = message.data;
      
      // Validações
      if (!name || !symbol) {
        this.sendError(ws, 'Nome e símbolo do criptoativo são obrigatórios', message.requestId);
        return;
      }
      
      if (!creatorAddress) {
        this.sendError(ws, 'Endereço do criador não fornecido', message.requestId);
        return;
      }
      
      // Verifica se a carteira do criador existe
      const creatorWallet = this.walletManager.getWallet(creatorAddress);
      if (!creatorWallet) {
        this.sendError(ws, `Carteira do criador não encontrada: ${creatorAddress}`, message.requestId);
        return;
      }
      
      // Cria o criptoativo
      const asset = await this.assetManager.createAsset(
        name,
        symbol,
        decimals || 8,
        totalSupply || 1000000,
        description || `${name} (${symbol}) - Criptoativo na blockchain Nebulus`,
        creatorAddress,
        metadata
      );
      
      this.sendResponse(ws, { 
        success: true, 
        asset,
        message: `Criptoativo ${name} (${symbol}) criado com sucesso`
      }, message.requestId);
      
      // Broadcast do evento de atualização de criptoativo
      this.broadcastEvent(WSMessageType.ASSET_UPDATED_EVENT, {
        type: 'created',
        assetId: asset.id
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao criar criptoativo: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para criar (mint) uma quantidade de um criptoativo
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleMintAsset(message: WSMessage, ws: any): Promise<void> {
    try {
      if (!message.data || !message.data.assetId || !message.data.toAddress || message.data.amount === undefined) {
        this.sendError(ws, 'Dados da operação de mint incompletos', message.requestId);
        return;
      }
      
      const { assetId, toAddress, amount } = message.data;
      
      // Verifica se o criptoativo existe
      const asset = this.assetManager.getAsset(assetId);
      if (!asset) {
        this.sendError(ws, `Criptoativo com ID ${assetId} não encontrado`, message.requestId);
        return;
      }
      
      // Verifica se o endereço de destino existe
      if (!this.walletManager.getWallet(toAddress)) {
        this.sendError(ws, `Carteira de destino não encontrada: ${toAddress}`, message.requestId);
        return;
      }
      
      // Cria (mint) a quantidade do criptoativo
      const transaction = await this.assetManager.mintAsset(assetId, toAddress, amount);
      
      this.sendResponse(ws, { 
        success: true, 
        transaction,
        message: `${amount} ${asset.symbol} criados com sucesso para ${toAddress}`
      }, message.requestId);
      
      // Broadcast do evento de atualização de criptoativo
      this.broadcastEvent(WSMessageType.ASSET_UPDATED_EVENT, {
        type: 'minted',
        assetId,
        toAddress,
        amount
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao criar (mint) criptoativo: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para transferir uma quantidade de um criptoativo
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleTransferAsset(message: WSMessage, ws: any): Promise<void> {
    try {
      if (!message.data || !message.data.assetId || !message.data.fromAddress || !message.data.toAddress || message.data.amount === undefined) {
        this.sendError(ws, 'Dados da transferência incompletos', message.requestId);
        return;
      }
      
      const { assetId, fromAddress, toAddress, amount } = message.data;
      
      // Verifica se o criptoativo existe
      const asset = this.assetManager.getAsset(assetId);
      if (!asset) {
        this.sendError(ws, `Criptoativo com ID ${assetId} não encontrado`, message.requestId);
        return;
      }
      
      // Verifica se as carteiras existem
      if (!this.walletManager.getWallet(fromAddress)) {
        this.sendError(ws, `Carteira de origem não encontrada: ${fromAddress}`, message.requestId);
        return;
      }
      
      if (!this.walletManager.getWallet(toAddress) && !this.walletManager.isValidAddress(toAddress)) {
        this.sendError(ws, `Carteira de destino inválida: ${toAddress}`, message.requestId);
        return;
      }
      
      // Verifica se o endereço de origem tem saldo suficiente
      const balance = this.assetManager.getBalance(assetId, fromAddress);
      if (balance < amount) {
        this.sendError(ws, `Saldo insuficiente. Disponível: ${balance} ${asset.symbol}, Necessário: ${amount} ${asset.symbol}`, message.requestId);
        return;
      }
      
      // Transfere o criptoativo
      const transaction = await this.assetManager.transferAsset(assetId, fromAddress, toAddress, amount);
      
      this.sendResponse(ws, { 
        success: true, 
        transaction,
        message: `${amount} ${asset.symbol} transferidos com sucesso de ${fromAddress} para ${toAddress}`
      }, message.requestId);
      
      // Broadcast do evento de atualização de criptoativo
      this.broadcastEvent(WSMessageType.ASSET_UPDATED_EVENT, {
        type: 'transferred',
        assetId,
        fromAddress,
        toAddress,
        amount
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao transferir criptoativo: ${error}`, message.requestId);
    }
  }
  
  /**
   * Processa uma solicitação para destruir (burn) uma quantidade de um criptoativo
   * @param message Mensagem recebida
   * @param ws Conexão WebSocket
   */
  private async handleBurnAsset(message: WSMessage, ws: any): Promise<void> {
    try {
      if (!message.data || !message.data.assetId || !message.data.fromAddress || message.data.amount === undefined) {
        this.sendError(ws, 'Dados da operação de burn incompletos', message.requestId);
        return;
      }
      
      const { assetId, fromAddress, amount } = message.data;
      
      // Verifica se o criptoativo existe
      const asset = this.assetManager.getAsset(assetId);
      if (!asset) {
        this.sendError(ws, `Criptoativo com ID ${assetId} não encontrado`, message.requestId);
        return;
      }
      
      // Verifica se a carteira existe
      if (!this.walletManager.getWallet(fromAddress)) {
        this.sendError(ws, `Carteira não encontrada: ${fromAddress}`, message.requestId);
        return;
      }
      
      // Verifica se o endereço tem saldo suficiente
      const balance = this.assetManager.getBalance(assetId, fromAddress);
      if (balance < amount) {
        this.sendError(ws, `Saldo insuficiente. Disponível: ${balance} ${asset.symbol}, Necessário: ${amount} ${asset.symbol}`, message.requestId);
        return;
      }
      
      // Destrói (burn) o criptoativo
      const transaction = await this.assetManager.burnAsset(assetId, fromAddress, amount);
      
      this.sendResponse(ws, { 
        success: true, 
        transaction,
        message: `${amount} ${asset.symbol} destruídos com sucesso de ${fromAddress}`
      }, message.requestId);
      
      // Broadcast do evento de atualização de criptoativo
      this.broadcastEvent(WSMessageType.ASSET_UPDATED_EVENT, {
        type: 'burned',
        assetId,
        fromAddress,
        amount
      });
      
    } catch (error) {
      this.sendError(ws, `Erro ao destruir (burn) criptoativo: ${error}`, message.requestId);
    }
  }

  /**
   * Para o servidor WebSocket
   */
  public stop(): void {
    this.wss.close();
    console.log('Servidor WebSocket parado');
  }
}
