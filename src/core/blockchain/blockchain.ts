/**
 * Blockchain.ts
 * Implementa a cadeia de blocos e suas operações
 */

import { Block, BlockData, BlockImpl } from './block';
import { hashData } from '../utils/hash';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export class Blockchain extends EventEmitter {
  private chain: Block[];
  private difficulty: number;
  private dataDir: string;
  private pendingTransactions: BlockData[] = [];
  private miningInterval: NodeJS.Timeout | null = null;
  private blockGenerationInterval: number = 5; // 5ms entre blocos
  private maxTransactionsPerBlock: number = 10; // Máximo de transações por bloco

  /**
   * Construtor da blockchain
   * @param dataDir Diretório para armazenamento dos blocos
   * @param difficulty Dificuldade de mineração
   * @param blockGenerationInterval Intervalo em ms para geração de blocos
   * @param maxTransactionsPerBlock Número máximo de transações por bloco
   */
  constructor(
    dataDir: string = './data/blockchain', 
    difficulty: number = 2,
    blockGenerationInterval: number = 5,
    maxTransactionsPerBlock: number = 10
  ) {
    super(); // Inicializa o EventEmitter
    
    this.chain = [];
    this.difficulty = difficulty;
    this.dataDir = dataDir;
    this.blockGenerationInterval = blockGenerationInterval;
    this.maxTransactionsPerBlock = maxTransactionsPerBlock;
    
    // Cria o diretório de dados se não existir
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Carrega a blockchain do armazenamento ou cria o bloco gênesis
    this.loadChain();
    
    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
    
    // Inicia o processo de mineração automática
    this.startMining();
  }

  /**
   * Cria o bloco gênesis (primeiro bloco da cadeia)
   */
  private createGenesisBlock(): void {
    const genesisData: BlockData = {
      type: 'identity',
      payload: 'Genesis Block - Nebulus Network',
      signatures: [],
      requiredSigners: 0
    };
    
    const genesisBlock = new BlockImpl(
      Date.now(),
      genesisData,
      '0'
    );
    
    this.chain.push(genesisBlock);
    this.saveBlock(genesisBlock);
  }

  /**
   * Obtém o último bloco da cadeia
   * @returns O último bloco
   */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Adiciona uma transação ao pool de transações pendentes
   * @param data Dados da transação a ser adicionada
   * @returns true se a transação foi adicionada com sucesso
   */
  addTransaction(data: BlockData): boolean {
    try {
      this.pendingTransactions.push(data);
      console.log(`Transação adicionada ao pool. Total pendente: ${this.pendingTransactions.length}`);
      return true;
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      return false;
    }
  }

  /**
   * Inicia o processo de mineração automática
   */
  startMining(): void {
    if (this.miningInterval) {
      clearInterval(this.miningInterval);
    }
    
    this.miningInterval = setInterval(() => {
      if (this.pendingTransactions.length > 0) {
        this.mineNextBlock();
      }
    }, this.blockGenerationInterval);
    
    console.log(`Mineração automática iniciada (intervalo: ${this.blockGenerationInterval}ms)`);
  }

  /**
   * Para o processo de mineração automática
   */
  stopMining(): void {
    if (this.miningInterval) {
      clearInterval(this.miningInterval);
      this.miningInterval = null;
      console.log('Mineração automática parada');
    }
  }

  /**
   * Minera o próximo bloco com as transações pendentes
   * @param validatorAddress Endereço do validador que está minerando o bloco
   * @returns O bloco minerado ou null se não houver transações pendentes
   */
  mineNextBlock(validatorAddress?: string): Block | null {
    if (this.pendingTransactions.length === 0) {
      return null;
    }
    
    // Pega as transações para o próximo bloco (até o máximo configurado)
    const transactionsForBlock = this.pendingTransactions.splice(0, this.maxTransactionsPerBlock);
    
    // Cria um bloco com múltiplas transações
    const previousBlock = this.getLatestBlock();
    const timestamp = Date.now();
    
    // Cria um BlockData que contém múltiplas transações
    const blockData: BlockData = {
      type: "transaction_batch",
      payload: transactionsForBlock,
      signatures: [],
      requiredSigners: 0
    };
    
    // Cria e minera o novo bloco
    const newBlock = new BlockImpl(
      timestamp,
      blockData,
      previousBlock.hash
    );
    
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    this.saveBlock(newBlock);
    
    console.log(`Bloco minerado com ${transactionsForBlock.length} transações: ${newBlock.hash}`);
    
    // Emite o evento de bloco validado
    if (validatorAddress) {
      this.emit('block:validated', {
        blockHash: newBlock.hash,
        validatorAddress,
        timestamp: Date.now()
      });
      console.log(`Evento 'block:validated' emitido para o bloco ${newBlock.hash} validado por ${validatorAddress}`);
    }
    
    return newBlock;
  }

  /**
   * Adiciona um novo bloco à cadeia (método legado, agora usa o pool de transações)
   * @param data Dados a serem armazenados no bloco
   * @returns O bloco adicionado
   */
  addBlock(data: BlockData): Block {
    // Adiciona a transação ao pool e força a mineração imediata
    this.addTransaction(data);
    return this.mineNextBlock() as Block;
  }
  
  /**
   * Adiciona um bloco já minerado à cadeia
   * @param block Bloco já minerado
   * @param validatorAddress Endereço do validador que validou o bloco
   * @returns true se o bloco foi adicionado com sucesso, false caso contrário
   */
  addMinedBlock(block: Block, validatorAddress?: string): boolean {
    try {
      // Verifica se o bloco é válido
      if (!block.isValid()) {
        console.error('Bloco inválido: hash não corresponde ao conteúdo');
        return false;
      }
      
      // Verifica se o bloco aponta para o último bloco da cadeia
      const latestBlock = this.getLatestBlock();
      if (block.previousHash !== latestBlock.hash) {
        console.error('Bloco inválido: não aponta para o último bloco da cadeia');
        return false;
      }
      
      // Verifica se o bloco tem assinaturas suficientes
      if (!block.hasEnoughSignatures()) {
        console.error('Bloco inválido: assinaturas insuficientes');
        return false;
      }
      
      // Adiciona o bloco à cadeia
      this.chain.push(block);
      this.saveBlock(block);
      
      console.log(`Bloco adicionado à cadeia: ${block.hash}`);
      
      // Emite o evento de bloco validado
      if (validatorAddress) {
        this.emit('block:validated', {
          blockHash: block.hash,
          validatorAddress,
          timestamp: Date.now()
        });
        console.log(`Evento 'block:validated' emitido para o bloco ${block.hash} validado por ${validatorAddress}`);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao adicionar bloco minerado:', error);
      return false;
    }
  }

  /**
   * Verifica se a cadeia é válida
   * @returns true se a cadeia for válida, false caso contrário
   */
  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verifica se o hash do bloco atual é válido
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
      
      // Verifica se o bloco aponta para o hash anterior correto
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
      
      // Verifica se o bloco tem assinaturas suficientes
      if (!currentBlock.hasEnoughSignatures()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Salva um bloco no armazenamento local
   * @param block Bloco a ser salvo
   */
  private saveBlock(block: Block): void {
    const blockFile = path.join(this.dataDir, `${block.hash}.json`);
    fs.writeFileSync(blockFile, JSON.stringify(block, null, 2));
  }

  /**
   * Carrega a cadeia de blocos do armazenamento local
   */
  private loadChain(): void {
    if (!fs.existsSync(this.dataDir)) {
      return;
    }
    
    const files = fs.readdirSync(this.dataDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const blockA = JSON.parse(fs.readFileSync(path.join(this.dataDir, a), 'utf8'));
        const blockB = JSON.parse(fs.readFileSync(path.join(this.dataDir, b), 'utf8'));
        return blockA.timestamp - blockB.timestamp;
      });
    
    this.chain = files.map(file => {
      const blockData = JSON.parse(fs.readFileSync(path.join(this.dataDir, file), 'utf8'));
      return blockData as Block;
    });
  }

  /**
   * Obtém todos os blocos da cadeia
   * @returns Array com todos os blocos
   */
  getAllBlocks(): Block[] {
    return [...this.chain];
  }

  /**
   * Busca um bloco pelo seu hash
   * @param hash Hash do bloco
   * @returns O bloco encontrado ou undefined
   */
  getBlockByHash(hash: string): Block | undefined {
    return this.chain.find(block => block.hash === hash);
  }

  /**
   * Busca blocos por tipo de registro
   * @param type Tipo de registro
   * @returns Array com os blocos encontrados
   */
  getBlocksByType(type: string): Block[] {
    const blocks: Block[] = [];
    
    for (const block of this.chain) {
      // Verifica se o bloco é do tipo especificado
      if (block.data.type === type) {
        blocks.push(block);
      }
      
      // Se for um lote de transações, verifica cada transação dentro do lote
      if (block.data.type === "transaction_batch" && Array.isArray(block.data.payload)) {
        const transactions = block.data.payload as BlockData[];
        if (transactions.some(tx => tx.type === type)) {
          blocks.push(block);
        }
      }
    }
    
    return blocks;
  }
  
  /**
   * Obtém todas as transações de um determinado tipo
   * @param type Tipo de transação
   * @returns Array com todas as transações do tipo especificado
   */
  getTransactionsByType(type: string): BlockData[] {
    const transactions: BlockData[] = [];
    
    for (const block of this.chain) {
      // Se for um bloco de transação direta do tipo especificado
      if (block.data.type === type) {
        transactions.push(block.data);
      }
      
      // Se for um lote de transações, extrai as do tipo especificado
      if (block.data.type === "transaction_batch" && Array.isArray(block.data.payload)) {
        const blockTransactions = block.data.payload as BlockData[];
        transactions.push(...blockTransactions.filter(tx => tx.type === type));
      }
    }
    
    return transactions;
  }
  
  /**
   * Obtém o número de transações pendentes
   * @returns Número de transações pendentes
   */
  getPendingTransactionsCount(): number {
    return this.pendingTransactions.length;
  }
}
