/**
 * Node.ts
 * Implementa a comunicação P2P entre nós (versão simplificada)
 */

import { EventEmitter } from 'events';
import { BootstrapManager, BootstrapNode, nodeToMultiaddr, DEFAULT_P2P_PORT } from './bootstrap';

// Eventos emitidos pelo nó
export enum NodeEvent {
  PEER_CONNECTED = 'peer:connected',
  PEER_DISCONNECTED = 'peer:disconnected',
  MESSAGE_RECEIVED = 'message:received',
  NODE_STARTED = 'node:started',
  NODE_STOPPED = 'node:stopped'
}

// Tipos de mensagens
export enum MessageType {
  NEW_BLOCK = 'new_block',
  REQUEST_CHAIN = 'request_chain',
  CHAIN_RESPONSE = 'chain_response',
  REQUEST_BLOCK = 'request_block',
  BLOCK_RESPONSE = 'block_response',
  VALIDATE_BLOCK = 'validate_block',
  VALIDATION_RESPONSE = 'validation_response',
  CONSENSUS_REQUEST = 'consensus_request',
  CONSENSUS_RESPONSE = 'consensus_response',
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response'
}

// Interface para mensagens
export interface Message {
  type: MessageType;
  data: any;
  sender: string;
  timestamp: number;
}

// Status de validação de bloco
export enum ValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  UNKNOWN = 'unknown'
}

// Resultado de validação de bloco
export interface ValidationResult {
  blockHash: string;
  status: ValidationStatus;
  reason?: string;
}

// Resultado de consenso
export interface ConsensusResult {
  blockHash: string;
  validations: ValidationResult[];
  accepted: boolean;
}

/**
 * Classe que implementa um nó P2P simplificado
 * Nota: Esta é uma implementação básica para MVP.
 * A implementação completa com libp2p será adicionada em versões futuras.
 */
export class Node extends EventEmitter {
  private nodeId: string;
  private isRunning: boolean = false;
  private bootstrapManager: BootstrapManager;
  private connectedPeers: Set<string> = new Set();
  private port: number;

  /**
   * Construtor da classe Node
   * @param port Porta para escutar conexões (opcional)
   */
  constructor(port: number = DEFAULT_P2P_PORT) {
    super();
    this.nodeId = this.generateNodeId();
    this.bootstrapManager = new BootstrapManager();
    this.port = port;
  }

  /**
   * Gera um ID único para o nó
   * @returns ID do nó
   */
  private generateNodeId(): string {
    return `node-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Inicializa o nó P2P
   */
  async start(): Promise<void> {
    try {
      // Inicializa o gerenciador de bootstrap
      await this.bootstrapManager.initialize();
      
      this.isRunning = true;
      console.log(`Nó P2P iniciado com ID: ${this.nodeId} na porta ${this.port}`);
      
      // Obtém a lista de nós bootstrap
      const bootstrapNodes = this.bootstrapManager.getNodes();
      
      // Filtra os nós bootstrap para remover o próprio nó
      const filteredNodes = bootstrapNodes.filter(node => 
        !(node.port === this.port && (
          node.ip === 'localhost' || 
          node.ip === '127.0.0.1' || 
          this.isLocalIP(node.ip)
        ))
      );
      
      // Simula conexão com nós bootstrap
      if (filteredNodes.length > 0) {
        console.log(`Tentando conectar a ${filteredNodes.length} nós bootstrap...`);
        
        // Em uma implementação real, aqui seria feita a conexão com os nós bootstrap
        for (const node of filteredNodes) {
          try {
            // Verifica se já está conectado a este peer
            const nodeAddr = nodeToMultiaddr(node);
            if (this.connectedPeers.has(nodeAddr)) {
              console.log(`Já conectado ao nó bootstrap: ${nodeAddr}`);
              continue;
            }
            
            // Simulação de conexão bem-sucedida
            if (Math.random() > 0.3) { // 70% de chance de sucesso
              this.connectedPeers.add(nodeAddr);
              console.log(`Conectado ao nó bootstrap: ${nodeAddr}`);
              this.emit(NodeEvent.PEER_CONNECTED, { peerId: nodeAddr });
              
              // Atualiza o timestamp de último contato
              this.bootstrapManager.updateNodeLastSeen(node.ip, node.port);
            }
          } catch (error) {
            console.error(`Erro ao conectar ao nó bootstrap ${nodeToMultiaddr(node)}:`, error);
            // Continua tentando conectar aos outros nós mesmo se falhar em um
          }
        }
      } else {
        console.log('Nenhum nó bootstrap disponível para conexão');
      }
      
      // Emite evento de nó iniciado
      this.emit(NodeEvent.NODE_STARTED, { nodeId: this.nodeId });
      
    } catch (error) {
      console.error('Erro ao iniciar nó P2P:', error);
      throw error;
    }
  }

  /**
   * Para o nó P2P
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.connectedPeers.clear();
    console.log('Nó P2P parado');
    this.emit(NodeEvent.NODE_STOPPED);
  }

  /**
   * Envia uma mensagem para todos os peers conectados
   * @param type Tipo da mensagem
   * @param data Dados da mensagem
   */
  async broadcast(type: MessageType, data: any): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Nó P2P não inicializado');
    }
    
    const message: Message = {
      type,
      data,
      sender: this.nodeId,
      timestamp: Date.now()
    };
    
    console.log(`Broadcast de mensagem tipo: ${type} para ${this.connectedPeers.size} peers`);
    
    // Em uma implementação real, aqui seria feito o broadcast para os peers
    // Por enquanto, apenas simulamos o envio
    this.connectedPeers.forEach(peer => {
      console.log(`Enviando mensagem para peer: ${peer}`);
      // Simulação de envio bem-sucedido
    });
  }

  /**
   * Obtém o ID do nó
   * @returns ID do nó
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Obtém a lista de peers conectados
   * @returns Lista de IDs dos peers conectados
   */
  getConnectedPeers(): string[] {
    return Array.from(this.connectedPeers);
  }

  /**
   * Conecta a um peer específico
   * @param address Endereço do peer (formato: ip:porta)
   */
  async connectToPeer(address: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Nó P2P não inicializado');
    }
    
    try {
      // Verifica se o endereço está no formato correto
      const [ip, portStr] = address.split(':');
      const port = parseInt(portStr, 10);
      
      if (!ip || isNaN(port)) {
        throw new Error('Formato de endereço inválido. Use o formato "ip:porta"');
      }
      
      // Verifica se o nó está tentando se conectar a si mesmo
      if (port === this.port && (ip === 'localhost' || ip === '127.0.0.1' || this.isLocalIP(ip))) {
        throw new Error('Um nó não pode se conectar a si mesmo');
      }
      
      // Verifica se já está conectado a este peer
      const nodeAddr = `/ip4/${ip}/tcp/${port}`;
      if (this.connectedPeers.has(nodeAddr)) {
        console.log(`Já conectado ao peer: ${nodeAddr}`);
        return;
      }
      
      // Em uma implementação real, aqui seria feita a conexão com o peer
      // Por enquanto, apenas simulamos a conexão
      this.connectedPeers.add(nodeAddr);
      console.log(`Conectado ao peer: ${nodeAddr}`);
      this.emit(NodeEvent.PEER_CONNECTED, { peerId: nodeAddr });
      
      // Adiciona o nó à lista de bootstrap
      this.bootstrapManager.addNode({ ip, port });
    } catch (error) {
      console.error(`Erro ao conectar ao peer ${address}:`, error);
      throw error;
    }
  }
  
  /**
   * Verifica se um IP é local (pertence a esta máquina)
   * @param ip Endereço IP a verificar
   * @returns true se o IP for local, false caso contrário
   */
  private isLocalIP(ip: string): boolean {
    // Implementação simplificada para verificar IPs locais
    // Em uma implementação real, seria necessário obter todos os IPs da máquina
    // Para fins de teste, consideramos apenas localhost e 127.0.0.1 como locais
    return ip === '127.0.0.1' || ip === 'localhost';
    
    // Versão mais completa para produção:
    // return ip === '127.0.0.1' || ip === 'localhost' || 
    //   this.getLocalIPs().includes(ip);
  }
  
  /**
   * Obtém os IPs locais da máquina (método stub para demonstração)
   * @returns Lista de IPs locais
   */
  private getLocalIPs(): string[] {
    // Em uma implementação real, este método obteria todos os IPs da máquina
    // usando recursos do sistema operacional
    // Por enquanto, retornamos uma lista vazia
    return [];
  }

  /**
   * Desconecta de um peer específico
   * @param address Endereço do peer (formato: ip:porta)
   */
  async disconnectFromPeer(address: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Nó P2P não inicializado');
    }
    
    try {
      // Verifica se o endereço está no formato correto
      const [ip, portStr] = address.split(':');
      const port = parseInt(portStr, 10);
      
      if (!ip || isNaN(port)) {
        throw new Error('Formato de endereço inválido. Use o formato "ip:porta"');
      }
      
      const nodeAddr = `/ip4/${ip}/tcp/${port}`;
      
      if (this.connectedPeers.has(nodeAddr)) {
        this.connectedPeers.delete(nodeAddr);
        console.log(`Desconectado do peer: ${nodeAddr}`);
        this.emit(NodeEvent.PEER_DISCONNECTED, { peerId: nodeAddr });
      }
    } catch (error) {
      console.error(`Erro ao desconectar do peer ${address}:`, error);
      throw error;
    }
  }

  /**
   * Verifica se o nó está em execução
   * @returns true se o nó estiver em execução, false caso contrário
   */
  isActive(): boolean {
    return this.isRunning;
  }
  
  /**
   * Obtém a porta do nó
   * @returns Porta do nó
   */
  getPort(): number {
    return this.port;
  }
  
  /**
   * Adiciona um nó à lista de bootstrap
   * @param ip IP do nó
   * @param port Porta do nó
   */
  addBootstrapNode(ip: string, port: number): void {
    this.bootstrapManager.addNode({ ip, port });
  }
  
  /**
   * Remove um nó da lista de bootstrap
   * @param ip IP do nó
   * @param port Porta do nó
   */
  removeBootstrapNode(ip: string, port: number): void {
    this.bootstrapManager.removeNode(ip, port);
  }
  
  /**
   * Obtém a lista de nós bootstrap
   * @returns Lista de nós bootstrap
   */
  getBootstrapNodes(): BootstrapNode[] {
    return this.bootstrapManager.getNodes();
  }

  /**
   * Solicita sincronização da blockchain com os peers
   * @param blockchain Instância da blockchain
   */
  async syncBlockchain(blockchain: any): Promise<void> {
    if (!this.isRunning || this.connectedPeers.size === 0) {
      console.log('Não há peers conectados para sincronização');
      return;
    }

    console.log('Iniciando sincronização da blockchain com peers...');
    
    // Obtém o último bloco da blockchain local
    const latestBlock = blockchain.getLatestBlock();
    
    // Solicita a blockchain completa dos peers
    await this.broadcast(MessageType.SYNC_REQUEST, {
      latestBlockHash: latestBlock.hash,
      nodeId: this.nodeId
    });
    
    console.log(`Solicitação de sincronização enviada para ${this.connectedPeers.size} peers`);
  }

  /**
   * Processa uma solicitação de sincronização
   * @param data Dados da solicitação
   * @param blockchain Instância da blockchain
   */
  async processSyncRequest(data: any, blockchain: any): Promise<void> {
    console.log(`Recebida solicitação de sincronização do nó ${data.nodeId}`);
    
    // Obtém todos os blocos da blockchain local
    const localBlocks = blockchain.getAllBlocks();
    
    // Verifica se o peer tem o último bloco
    const peerLatestBlockHash = data.latestBlockHash;
    const peerHasLatestBlock = localBlocks.some(block => block.hash === peerLatestBlockHash);
    
    // Se o peer já tem o último bloco, não precisa enviar nada
    if (peerHasLatestBlock && localBlocks.length <= 1) {
      console.log('Peer já está sincronizado');
      return;
    }
    
    // Encontra o índice do último bloco que o peer tem
    let startIndex = 0;
    if (peerHasLatestBlock) {
      startIndex = localBlocks.findIndex(block => block.hash === peerLatestBlockHash) + 1;
    }
    
    // Envia os blocos que o peer não tem
    const blocksToSend = localBlocks.slice(startIndex);
    
    if (blocksToSend.length > 0) {
      console.log(`Enviando ${blocksToSend.length} blocos para sincronização`);
      
      // Simula o envio dos blocos para o peer
      // Em uma implementação real, enviaria para o peer específico
      await this.broadcast(MessageType.SYNC_RESPONSE, {
        blocks: blocksToSend,
        targetNodeId: data.nodeId
      });
    } else {
      console.log('Não há blocos novos para enviar');
    }
  }

  /**
   * Processa uma resposta de sincronização
   * @param data Dados da resposta
   * @param blockchain Instância da blockchain
   */
  async processSyncResponse(data: any, blockchain: any): Promise<void> {
    // Verifica se a resposta é para este nó
    if (data.targetNodeId !== this.nodeId) {
      return;
    }
    
    console.log(`Recebidos ${data.blocks.length} blocos para sincronização`);
    
    // Processa cada bloco recebido
    for (const block of data.blocks) {
      // Verifica se o bloco já existe na blockchain local
      const existingBlock = blockchain.getBlockByHash(block.hash);
      if (existingBlock) {
        console.log(`Bloco ${block.hash} já existe na blockchain local`);
        continue;
      }
      
      // Valida o bloco antes de adicioná-lo
      const validationResult = await this.validateBlock(block, blockchain);
      
      if (validationResult.status === ValidationStatus.VALID) {
        // Adiciona o bloco à blockchain local
        try {
          // Usa o método addMinedBlock para adicionar o bloco já minerado
          const success = blockchain.addMinedBlock(block);
          if (success) {
            console.log(`Bloco ${block.hash} adicionado à blockchain local`);
          } else {
            console.error(`Falha ao adicionar bloco ${block.hash} à blockchain local`);
          }
        } catch (error) {
          console.error(`Erro ao adicionar bloco ${block.hash}:`, error);
        }
      } else {
        console.error(`Bloco ${block.hash} inválido: ${validationResult.reason}`);
      }
    }
    
    console.log('Sincronização concluída');
  }

  /**
   * Valida um bloco
   * @param block Bloco a ser validado
   * @param blockchain Instância da blockchain
   * @returns Resultado da validação
   */
  async validateBlock(block: any, blockchain: any): Promise<ValidationResult> {
    try {
      // Verifica se o hash do bloco é válido
      if (block.hash !== block.calculateHash()) {
        return {
          blockHash: block.hash,
          status: ValidationStatus.INVALID,
          reason: 'Hash do bloco inválido'
        };
      }
      
      // Verifica se o bloco aponta para o bloco anterior correto
      const previousBlock = blockchain.getBlockByHash(block.previousHash);
      if (!previousBlock && block.previousHash !== '0') {
        return {
          blockHash: block.hash,
          status: ValidationStatus.INVALID,
          reason: 'Bloco anterior não encontrado'
        };
      }
      
      // Verifica se o bloco tem assinaturas suficientes
      if (!block.hasEnoughSignatures()) {
        return {
          blockHash: block.hash,
          status: ValidationStatus.INVALID,
          reason: 'Assinaturas insuficientes'
        };
      }
      
      // Verifica as assinaturas
      // Em uma implementação real, seria necessário verificar cada assinatura
      // usando a chave pública correspondente
      
      return {
        blockHash: block.hash,
        status: ValidationStatus.VALID
      };
    } catch (error) {
      return {
        blockHash: block.hash,
        status: ValidationStatus.INVALID,
        reason: `Erro na validação: ${error}`
      };
    }
  }

  /**
   * Solicita validação de um bloco aos peers
   * @param block Bloco a ser validado
   */
  async requestBlockValidation(block: any): Promise<void> {
    if (!this.isRunning || this.connectedPeers.size === 0) {
      console.log('Não há peers conectados para validação');
      return;
    }
    
    console.log(`Solicitando validação do bloco ${block.hash} aos peers...`);
    
    // Envia solicitação de validação para todos os peers
    await this.broadcast(MessageType.VALIDATE_BLOCK, {
      block,
      requesterId: this.nodeId
    });
  }

  /**
   * Processa uma solicitação de validação de bloco
   * @param data Dados da solicitação
   * @param blockchain Instância da blockchain
   */
  async processValidationRequest(data: any, blockchain: any): Promise<void> {
    const block = data.block;
    const requesterId = data.requesterId;
    
    console.log(`Recebida solicitação de validação do bloco ${block.hash} do nó ${requesterId}`);
    
    // Valida o bloco
    const validationResult = await this.validateBlock(block, blockchain);
    
    // Envia a resposta de validação
    // Em uma implementação real, enviaria para o peer específico
    await this.broadcast(MessageType.VALIDATION_RESPONSE, {
      validation: validationResult,
      targetNodeId: requesterId
    });
  }

  /**
   * Processa uma resposta de validação de bloco
   * @param data Dados da resposta
   * @param validations Mapa de validações recebidas
   */
  processValidationResponse(data: any, validations: Map<string, ValidationResult[]>): void {
    // Verifica se a resposta é para este nó
    if (data.targetNodeId !== this.nodeId) {
      return;
    }
    
    const validation = data.validation;
    console.log(`Recebida resposta de validação para o bloco ${validation.blockHash}: ${validation.status}`);
    
    // Armazena a validação
    if (!validations.has(validation.blockHash)) {
      validations.set(validation.blockHash, []);
    }
    
    validations.get(validation.blockHash)?.push(validation);
  }

  /**
   * Verifica se há consenso para um bloco
   * @param blockHash Hash do bloco
   * @param validations Mapa de validações recebidas
   * @param threshold Porcentagem mínima de validações positivas (0-1)
   * @returns Resultado do consenso
   */
  checkConsensus(blockHash: string, validations: Map<string, ValidationResult[]>, threshold: number = 0.67): ConsensusResult {
    if (!validations.has(blockHash)) {
      return {
        blockHash,
        validations: [],
        accepted: false
      };
    }
    
    const blockValidations = validations.get(blockHash) || [];
    const totalValidations = blockValidations.length;
    
    if (totalValidations === 0) {
      return {
        blockHash,
        validations: [],
        accepted: false
      };
    }
    
    // Conta as validações positivas
    const validCount = blockValidations.filter(v => v.status === ValidationStatus.VALID).length;
    
    // Calcula a porcentagem de validações positivas
    const validPercentage = validCount / totalValidations;
    
    // Verifica se atingiu o threshold
    const accepted = validPercentage >= threshold;
    
    return {
      blockHash,
      validations: blockValidations,
      accepted
    };
  }

  /**
   * Anuncia um novo bloco para a rede
   * @param block Bloco a ser anunciado
   */
  async announceNewBlock(block: any): Promise<void> {
    console.log(`Anunciando novo bloco ${block.hash} para a rede...`);
    
    // Envia o bloco para todos os peers
    await this.broadcast(MessageType.NEW_BLOCK, {
      block,
      sender: this.nodeId
    });
  }
}
