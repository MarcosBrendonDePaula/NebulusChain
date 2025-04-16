/**
 * Asset.ts
 * Implementa um sistema de criptoativos para a blockchain
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { hashData } from '../utils/hash';
import { BlockData } from '../blockchain/block';
import { Blockchain } from '../blockchain/blockchain';
import { Identity } from '../identity/identity';

// Interface para representar um criptoativo
export interface Asset {
  id: string;           // ID único do criptoativo
  name: string;         // Nome do criptoativo
  symbol: string;       // Símbolo do criptoativo (ex: BTC, ETH)
  decimals: number;     // Número de casas decimais (ex: 8 para Bitcoin)
  totalSupply: number;  // Oferta total do criptoativo
  creator: string;      // Endereço do criador do criptoativo
  description: string;  // Descrição do criptoativo
  createdAt: number;    // Timestamp de criação
  metadata?: any;       // Metadados adicionais (opcional)
}

// Interface para representar um saldo de criptoativo
export interface AssetBalance {
  assetId: string;      // ID do criptoativo
  address: string;      // Endereço da carteira
  balance: number;      // Saldo do criptoativo
}

// Interface para transações de criptoativos
export interface AssetTransaction {
  type: 'mint' | 'transfer' | 'burn'; // Tipo de transação
  assetId: string;      // ID do criptoativo
  from: string;         // Endereço de origem (null para mint)
  to: string;           // Endereço de destino (null para burn)
  amount: number;       // Quantidade transferida
  timestamp: number;    // Timestamp da transação
  signature?: string;   // Assinatura da transação
}

/**
 * Classe que gerencia criptoativos
 */
export class AssetManager {
  private assetsDir: string;
  private assets: Map<string, Asset> = new Map();
  private balances: Map<string, Map<string, number>> = new Map(); // assetId -> (address -> balance)
  private identity: Identity;
  private blockchain: Blockchain;

  /**
   * Construtor da classe AssetManager
   * @param assetsDir Diretório para armazenar os criptoativos
   * @param identity Instância da identidade
   * @param blockchain Instância da blockchain
   */
  constructor(assetsDir: string = './data/assets', identity: Identity, blockchain: Blockchain) {
    this.assetsDir = assetsDir;
    this.identity = identity;
    this.blockchain = blockchain;
    
    // Cria o diretório de criptoativos se não existir
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
  }

  /**
   * Inicializa o gerenciador de criptoativos
   */
  initialize(): void {
    // Carrega todos os criptoativos do diretório
    this.loadAssets();
    console.log(`Criptoativos carregados: ${this.assets.size}`);
    
    // Calcula os saldos dos criptoativos
    this.calculateBalances();
  }

  /**
   * Carrega todos os criptoativos do diretório
   */
  private loadAssets(): void {
    if (!fs.existsSync(this.assetsDir)) {
      return;
    }

    const files = fs.readdirSync(this.assetsDir)
      .filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const assetData = JSON.parse(fs.readFileSync(path.join(this.assetsDir, file), 'utf8'));
        this.assets.set(assetData.id, assetData);
      } catch (error) {
        console.error(`Erro ao carregar criptoativo ${file}:`, error);
      }
    }
  }

  /**
   * Cria um novo criptoativo
   * @param name Nome do criptoativo
   * @param symbol Símbolo do criptoativo
   * @param decimals Número de casas decimais
   * @param totalSupply Oferta total do criptoativo
   * @param description Descrição do criptoativo
   * @param creatorAddress Endereço do criador
   * @param metadata Metadados adicionais (opcional)
   * @returns O novo criptoativo criado
   */
  async createAsset(
    name: string,
    symbol: string,
    decimals: number,
    totalSupply: number,
    description: string,
    creatorAddress: string,
    metadata?: any
  ): Promise<Asset> {
    // Gera um ID único para o criptoativo
    const id = this.generateAssetId(name, symbol, creatorAddress);
    
    // Verifica se o criptoativo já existe
    if (this.assets.has(id)) {
      throw new Error(`Criptoativo com ID ${id} já existe`);
    }
    
    // Cria o criptoativo
    const asset: Asset = {
      id,
      name,
      symbol,
      decimals,
      totalSupply,
      creator: creatorAddress,
      description,
      createdAt: Date.now(),
      metadata
    };
    
    // Salva o criptoativo
    this.saveAsset(asset);
    
    // Adiciona o criptoativo ao mapa
    this.assets.set(id, asset);
    
    // Inicializa o mapa de saldos para este criptoativo
    this.balances.set(id, new Map());
    
    // Registra a criação do criptoativo na blockchain
    const assetCreationData: BlockData = {
      type: 'asset_creation',
      payload: {
        ...asset
      },
      signatures: [{
        publicKey: this.identity.getPublicKey(),
        signature: this.identity.sign(JSON.stringify(asset))
      }],
      requiredSigners: 1
    };
    
    // Adiciona a transação ao pool
    this.blockchain.addTransaction(assetCreationData);
    
    // Cria uma transação de mint para o criador
    await this.mintAsset(id, creatorAddress, totalSupply);
    
    return asset;
  }

  /**
   * Gera um ID único para o criptoativo
   * @param name Nome do criptoativo
   * @param symbol Símbolo do criptoativo
   * @param creator Endereço do criador
   * @returns ID único
   */
  private generateAssetId(name: string, symbol: string, creator: string): string {
    // Cria uma string com os dados do criptoativo
    const data = `${name}${symbol}${creator}${Date.now()}`;
    
    // Calcula o hash dos dados
    const hash = hashData(data);
    
    // Cria um prefixo para o ID (AST = Asset)
    const prefix = 'AST';
    
    // Pega os primeiros 32 caracteres do hash e adiciona o prefixo
    return `${prefix}${hash.substring(0, 32)}`;
  }

  /**
   * Salva um criptoativo no sistema de arquivos
   * @param asset Criptoativo a ser salvo
   */
  private saveAsset(asset: Asset): void {
    const filePath = path.join(this.assetsDir, `${asset.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(asset, null, 2));
  }

  /**
   * Obtém um criptoativo pelo ID
   * @param id ID do criptoativo
   * @returns O criptoativo ou undefined se não encontrado
   */
  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  /**
   * Obtém todos os criptoativos
   * @returns Lista de todos os criptoativos
   */
  getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  /**
   * Cria (mint) uma quantidade de um criptoativo para um endereço
   * @param assetId ID do criptoativo
   * @param toAddress Endereço de destino
   * @param amount Quantidade a ser criada
   * @returns A transação criada
   */
  async mintAsset(assetId: string, toAddress: string, amount: number): Promise<AssetTransaction> {
    // Verifica se o criptoativo existe
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Criptoativo com ID ${assetId} não encontrado`);
    }
    
    // Verifica se o endereço é válido
    if (!toAddress) {
      throw new Error('Endereço de destino inválido');
    }
    
    // Verifica se a quantidade é válida
    if (amount <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }
    
    // Cria a transação
    const transaction: AssetTransaction = {
      type: 'mint',
      assetId,
      from: '',  // Mint não tem origem
      to: toAddress,
      amount,
      timestamp: Date.now()
    };
    
    // Assina a transação
    transaction.signature = this.signTransaction(transaction);
    
    // Registra a transação na blockchain
    const assetTransactionData: BlockData = {
      type: 'asset_transaction',
      payload: transaction,
      signatures: [{
        publicKey: this.identity.getPublicKey(),
        signature: transaction.signature!
      }],
      requiredSigners: 1
    };
    
    // Adiciona a transação ao pool
    this.blockchain.addTransaction(assetTransactionData);
    
    // Atualiza o saldo
    this.updateBalance(assetId, toAddress, amount);
    
    return transaction;
  }

  /**
   * Transfere uma quantidade de um criptoativo entre endereços
   * @param assetId ID do criptoativo
   * @param fromAddress Endereço de origem
   * @param toAddress Endereço de destino
   * @param amount Quantidade a transferir
   * @returns A transação criada
   */
  async transferAsset(assetId: string, fromAddress: string, toAddress: string, amount: number): Promise<AssetTransaction> {
    // Verifica se o criptoativo existe
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Criptoativo com ID ${assetId} não encontrado`);
    }
    
    // Verifica se os endereços são válidos
    if (!fromAddress || !toAddress) {
      throw new Error('Endereços de origem e destino devem ser válidos');
    }
    
    // Verifica se a quantidade é válida
    if (amount <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }
    
    // Verifica se o endereço de origem tem saldo suficiente
    const balance = this.getBalance(assetId, fromAddress);
    if (balance < amount) {
      throw new Error(`Saldo insuficiente. Disponível: ${balance}, Necessário: ${amount}`);
    }
    
    // Cria a transação
    const transaction: AssetTransaction = {
      type: 'transfer',
      assetId,
      from: fromAddress,
      to: toAddress,
      amount,
      timestamp: Date.now()
    };
    
    // Assina a transação
    transaction.signature = this.signTransaction(transaction);
    
    // Registra a transação na blockchain
    const assetTransactionData: BlockData = {
      type: 'asset_transaction',
      payload: transaction,
      signatures: [{
        publicKey: this.identity.getPublicKey(),
        signature: transaction.signature!
      }],
      requiredSigners: 1
    };
    
    // Adiciona a transação ao pool
    this.blockchain.addTransaction(assetTransactionData);
    
    // Atualiza os saldos
    this.updateBalance(assetId, fromAddress, -amount);
    this.updateBalance(assetId, toAddress, amount);
    
    return transaction;
  }

  /**
   * Destrói (burn) uma quantidade de um criptoativo
   * @param assetId ID do criptoativo
   * @param fromAddress Endereço de origem
   * @param amount Quantidade a ser destruída
   * @returns A transação criada
   */
  async burnAsset(assetId: string, fromAddress: string, amount: number): Promise<AssetTransaction> {
    // Verifica se o criptoativo existe
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Criptoativo com ID ${assetId} não encontrado`);
    }
    
    // Verifica se o endereço é válido
    if (!fromAddress) {
      throw new Error('Endereço de origem inválido');
    }
    
    // Verifica se a quantidade é válida
    if (amount <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }
    
    // Verifica se o endereço de origem tem saldo suficiente
    const balance = this.getBalance(assetId, fromAddress);
    if (balance < amount) {
      throw new Error(`Saldo insuficiente. Disponível: ${balance}, Necessário: ${amount}`);
    }
    
    // Cria a transação
    const transaction: AssetTransaction = {
      type: 'burn',
      assetId,
      from: fromAddress,
      to: '',  // Burn não tem destino
      amount,
      timestamp: Date.now()
    };
    
    // Assina a transação
    transaction.signature = this.signTransaction(transaction);
    
    // Registra a transação na blockchain
    const assetTransactionData: BlockData = {
      type: 'asset_transaction',
      payload: transaction,
      signatures: [{
        publicKey: this.identity.getPublicKey(),
        signature: transaction.signature!
      }],
      requiredSigners: 1
    };
    
    // Adiciona a transação ao pool
    this.blockchain.addTransaction(assetTransactionData);
    
    // Atualiza o saldo
    this.updateBalance(assetId, fromAddress, -amount);
    
    // Atualiza a oferta total
    asset.totalSupply -= amount;
    this.saveAsset(asset);
    
    return transaction;
  }

  /**
   * Assina uma transação de criptoativo
   * @param transaction Transação a ser assinada
   * @returns Assinatura da transação
   */
  private signTransaction(transaction: AssetTransaction): string {
    // Cria uma string com os dados da transação
    const data = `${transaction.type}${transaction.assetId}${transaction.from}${transaction.to}${transaction.amount}${transaction.timestamp}`;
    
    // Assina os dados
    return this.identity.sign(data);
  }

  /**
   * Verifica se uma transação de criptoativo é válida
   * @param transaction Transação a ser verificada
   * @returns true se a transação for válida
   */
  verifyTransaction(transaction: AssetTransaction, publicKey: string): boolean {
    // Verifica se a transação tem uma assinatura
    if (!transaction.signature) {
      return false;
    }
    
    // Cria uma string com os dados da transação
    const data = `${transaction.type}${transaction.assetId}${transaction.from}${transaction.to}${transaction.amount}${transaction.timestamp}`;
    
    // Verifica a assinatura
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();
      
      return verify.verify(publicKey, transaction.signature, 'base64');
    } catch (error) {
      console.error('Erro ao verificar assinatura da transação:', error);
      return false;
    }
  }

  /**
   * Atualiza o saldo de um criptoativo para um endereço
   * @param assetId ID do criptoativo
   * @param address Endereço
   * @param amount Quantidade a adicionar (ou subtrair se negativo)
   */
  private updateBalance(assetId: string, address: string, amount: number): void {
    // Obtém o mapa de saldos para este criptoativo
    let assetBalances = this.balances.get(assetId);
    if (!assetBalances) {
      assetBalances = new Map();
      this.balances.set(assetId, assetBalances);
    }
    
    // Obtém o saldo atual
    const currentBalance = assetBalances.get(address) || 0;
    
    // Atualiza o saldo
    assetBalances.set(address, currentBalance + amount);
  }

  /**
   * Obtém o saldo de um criptoativo para um endereço
   * @param assetId ID do criptoativo
   * @param address Endereço
   * @returns Saldo do criptoativo
   */
  getBalance(assetId: string, address: string): number {
    // Obtém o mapa de saldos para este criptoativo
    const assetBalances = this.balances.get(assetId);
    if (!assetBalances) {
      return 0;
    }
    
    // Obtém o saldo
    return assetBalances.get(address) || 0;
  }

  /**
   * Obtém todos os saldos de um endereço
   * @param address Endereço
   * @returns Mapa de saldos (assetId -> balance)
   */
  getBalances(address: string): Map<string, number> {
    const result = new Map<string, number>();
    
    // Percorre todos os criptoativos
    for (const [assetId, assetBalances] of this.balances.entries()) {
      // Obtém o saldo para este endereço
      const balance = assetBalances.get(address) || 0;
      
      // Adiciona ao resultado se o saldo for maior que zero
      if (balance > 0) {
        result.set(assetId, balance);
      }
    }
    
    return result;
  }

  /**
   * Calcula os saldos de todos os criptoativos com base na blockchain
   */
  calculateBalances(): void {
    // Reseta todos os saldos
    this.balances.clear();
    
    // Inicializa os mapas de saldos para todos os criptoativos
    for (const assetId of this.assets.keys()) {
      this.balances.set(assetId, new Map());
    }
    
    // Obtém todas as transações de criptoativos da blockchain
    const transactions = this.blockchain.getTransactionsByType('asset_transaction');
    
    // Processa cada transação
    for (const tx of transactions) {
      const transaction = tx.payload as AssetTransaction;
      
      // Verifica se o criptoativo existe
      if (!this.assets.has(transaction.assetId)) {
        continue;
      }
      
      // Processa a transação de acordo com o tipo
      switch (transaction.type) {
        case 'mint':
          this.updateBalance(transaction.assetId, transaction.to, transaction.amount);
          break;
        
        case 'transfer':
          this.updateBalance(transaction.assetId, transaction.from, -transaction.amount);
          this.updateBalance(transaction.assetId, transaction.to, transaction.amount);
          break;
        
        case 'burn':
          this.updateBalance(transaction.assetId, transaction.from, -transaction.amount);
          break;
      }
    }
  }
}
