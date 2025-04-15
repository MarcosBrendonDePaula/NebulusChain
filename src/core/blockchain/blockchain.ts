/**
 * Blockchain.ts
 * Implementa a cadeia de blocos e suas operações
 */

import { Block, BlockData, BlockImpl } from './block';
import { hashData } from '../utils/hash';
import * as fs from 'fs';
import * as path from 'path';

export class Blockchain {
  private chain: Block[];
  private difficulty: number;
  private dataDir: string;

  /**
   * Construtor da blockchain
   * @param dataDir Diretório para armazenamento dos blocos
   * @param difficulty Dificuldade de mineração
   */
  constructor(dataDir: string = './data/blockchain', difficulty: number = 2) {
    this.chain = [];
    this.difficulty = difficulty;
    this.dataDir = dataDir;
    
    // Cria o diretório de dados se não existir
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Carrega a blockchain do armazenamento ou cria o bloco gênesis
    this.loadChain();
    
    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
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
   * Adiciona um novo bloco à cadeia
   * @param data Dados a serem armazenados no bloco
   * @returns O bloco adicionado
   */
  addBlock(data: BlockData): Block {
    const previousBlock = this.getLatestBlock();
    const newBlock = new BlockImpl(
      Date.now(),
      data,
      previousBlock.hash
    );
    
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    this.saveBlock(newBlock);
    
    return newBlock;
  }
  
  /**
   * Adiciona um bloco já minerado à cadeia
   * @param block Bloco já minerado
   * @returns true se o bloco foi adicionado com sucesso, false caso contrário
   */
  addMinedBlock(block: Block): boolean {
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
    return this.chain.filter(block => block.data.type === type);
  }
}
