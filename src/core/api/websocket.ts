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
import * as fs from 'fs';
import * as path from 'path';

// Tipos de mensagens WebSocket
export enum WSMessageType {
  // Comandos de consulta
  GET_BLOCKS = 'get_blocks',
  GET_BLOCK = 'get_block',
  GET_PEERS = 'get_peers',
  GET_NODE_INFO = 'get_node_info',
  
  // Comandos de ação
  ADD_TRANSACTION = 'add_transaction',
  ADD_FILE = 'add_file',
  DECRYPT_PAYLOAD = 'decrypt_payload',
  CONNECT_PEER = 'connect_peer',
  SYNC_BLOCKCHAIN = 'sync_blockchain',
  VALIDATE_BLOCK = 'validate_block',
  
  // Respostas
  RESPONSE = 'response',
  ERROR = 'error',
  
  // Eventos
  NEW_BLOCK_EVENT = 'new_block_event',
  PEER_CONNECTED_EVENT = 'peer_connected_event',
  PEER_DISCONNECTED_EVENT = 'peer_disconnected_event',
  SYNC_COMPLETED_EVENT = 'sync_completed_event',
  VALIDATION_RESULT_EVENT = 'validation_result_event'
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
   * Para o servidor WebSocket
   */
  public stop(): void {
    this.wss.close();
    console.log('Servidor WebSocket parado');
  }
}
