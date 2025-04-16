/**
 * Wallet.ts
 * Implementa um sistema de carteiras para a blockchain
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { hashData } from '../utils/hash';
import * as bip39 from 'bip39';
import HDKey from 'hdkey';

// Interface para representar uma carteira
export interface Wallet {
  address: string;        // Endereço legível da carteira (derivado da chave pública)
  publicKey: string;      // Chave pública em formato hexadecimal
  label: string;          // Nome amigável para a carteira
  balance: number;        // Saldo da carteira (calculado a partir da blockchain)
  createdAt: number;      // Timestamp de criação
}

// Interface para representar uma carteira com seed phrase
export interface WalletWithSeed extends Wallet {
  mnemonic: string;       // Seed phrase (12 palavras)
  privateKey: string;     // Chave privada em formato hexadecimal
}

// Interface para transações de carteira
export interface WalletTransaction {
  from: string;           // Endereço da carteira de origem
  to: string;             // Endereço da carteira de destino
  amount: number;         // Quantidade transferida
  timestamp: number;      // Timestamp da transação
  signature?: string;     // Assinatura da transação
}

/**
 * Classe que gerencia carteiras
 */
export class WalletManager {
  private walletsDir: string;
  private wallets: Map<string, Wallet> = new Map();

  /**
   * Construtor da classe WalletManager
   * @param walletsDir Diretório para armazenar as carteiras
   */
  constructor(walletsDir: string = './data/wallets') {
    this.walletsDir = walletsDir;
    
    // Cria o diretório de carteiras se não existir
    if (!fs.existsSync(walletsDir)) {
      fs.mkdirSync(walletsDir, { recursive: true });
    }
  }

  /**
   * Inicializa o gerenciador de carteiras
   */
  initialize(): void {
    // Carrega todas as carteiras do diretório
    this.loadWallets();
    console.log(`Carteiras carregadas: ${this.wallets.size}`);
  }

  /**
   * Carrega todas as carteiras do diretório
   */
  private loadWallets(): void {
    if (!fs.existsSync(this.walletsDir)) {
      return;
    }

    const files = fs.readdirSync(this.walletsDir)
      .filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const walletData = JSON.parse(fs.readFileSync(path.join(this.walletsDir, file), 'utf8'));
        this.wallets.set(walletData.address, walletData);
      } catch (error) {
        console.error(`Erro ao carregar carteira ${file}:`, error);
      }
    }
  }

  /**
   * Cria uma nova carteira
   * @param label Nome amigável para a carteira
   * @returns A nova carteira criada com seed phrase
   */
  async createWallet(label: string = 'Minha Carteira'): Promise<WalletWithSeed> {
    // Gera uma seed phrase aleatória (mnemônico)
    const mnemonic = bip39.generateMnemonic();
    
    // Deriva as chaves a partir do mnemônico
    const { privateKey, publicKey } = this.deriveKeysFromMnemonic(mnemonic);
    
    // Gera um endereço legível a partir da chave pública
    const address = this.generateReadableAddress(publicKey);
    
    // Cria a carteira com seed phrase
    const walletWithSeed: WalletWithSeed = {
      address,
      publicKey,
      privateKey,
      mnemonic,
      label,
      balance: 0,
      createdAt: Date.now()
    };
    
    // Cria a versão da carteira para armazenamento (sem chave privada e mnemônico)
    const wallet: Wallet = {
      address,
      publicKey,
      label,
      balance: 0,
      createdAt: Date.now()
    };
    
    // Salva a carteira (sem a chave privada e mnemônico)
    this.saveWallet(wallet);
    
    // Adiciona a carteira ao mapa
    this.wallets.set(address, wallet);
    
    // Retorna a carteira completa com seed phrase e chave privada
    return walletWithSeed;
  }
  
  /**
   * Deriva as chaves pública e privada a partir de um mnemônico
   * @param mnemonic Seed phrase (12 palavras)
   * @returns Objeto contendo a chave privada e pública
   */
  private deriveKeysFromMnemonic(mnemonic: string): { privateKey: string, publicKey: string } {
    // Converte o mnemônico para seed
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    
    // Cria uma HD Key a partir da seed
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // Deriva o caminho para a primeira conta (m/44'/0'/0'/0/0)
    // Isso segue o padrão BIP44 para derivação de chaves
    const childKey = hdkey.derive("m/44'/0'/0'/0/0");
    
    // Obtém as chaves privada e pública
    const privateKey = childKey.privateKey.toString('hex');
    const publicKey = childKey.publicKey.toString('hex');
    
    return { privateKey, publicKey };
  }

  /**
   * Gera um endereço legível a partir da chave pública
   * @param publicKey Chave pública em formato hexadecimal
   * @returns Endereço legível
   */
  private generateReadableAddress(publicKey: string): string {
    // Calcula o hash da chave pública
    const hash = hashData(publicKey);
    
    // Cria um prefixo para o endereço (NEB = Nebulus)
    const prefix = 'NEB';
    
    // Pega os primeiros 32 caracteres do hash e adiciona o prefixo
    return `${prefix}${hash.substring(0, 32)}`;
  }

  /**
   * Salva uma carteira no sistema de arquivos
   * @param wallet Carteira a ser salva
   */
  private saveWallet(wallet: Wallet): void {
    const filePath = path.join(this.walletsDir, `${wallet.address}.json`);
    fs.writeFileSync(filePath, JSON.stringify(wallet, null, 2));
  }

  /**
   * Obtém uma carteira pelo endereço
   * @param address Endereço da carteira
   * @returns A carteira ou undefined se não encontrada
   */
  getWallet(address: string): Wallet | undefined {
    return this.wallets.get(address);
  }

  /**
   * Obtém todas as carteiras
   * @returns Lista de todas as carteiras
   */
  getAllWallets(): Wallet[] {
    return Array.from(this.wallets.values());
  }

  // Esta função foi substituída pela versão abaixo que aceita a chave privada como parâmetro

  /**
   * Verifica se um endereço de carteira é válido
   * @param address Endereço a verificar
   * @returns true se o endereço for válido
   */
  isValidAddress(address: string): boolean {
    // Verifica se o endereço tem o formato correto
    return address.startsWith('NEB') && address.length === 35;
  }

  /**
   * Assina uma transação com a chave privada
   * @param transaction Transação a ser assinada
   * @param privateKeyHex Chave privada em formato hexadecimal
   * @returns Assinatura da transação
   */
  private signTransaction(transaction: WalletTransaction, privateKeyHex: string): string {
    // Cria uma string com os dados da transação
    const data = `${transaction.from}${transaction.to}${transaction.amount}${transaction.timestamp}`;
    
    // Converte a chave privada de hex para buffer
    const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
    
    // Cria um objeto de chave privada
    const privateKey = crypto.createPrivateKey({
      key: privateKeyBuffer,
      format: 'der',
      type: 'pkcs8'
    });
    
    // Assina os dados
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verifica se uma transação é válida
   * @param transaction Transação a ser verificada
   * @returns true se a transação for válida
   */
  verifyTransaction(transaction: WalletTransaction): boolean {
    // Verifica se a transação tem uma assinatura
    if (!transaction.signature) {
      return false;
    }
    
    // Obtém a carteira de origem
    const fromWallet = this.wallets.get(transaction.from);
    if (!fromWallet) {
      return false;
    }
    
    // Cria uma string com os dados da transação
    const data = `${transaction.from}${transaction.to}${transaction.amount}${transaction.timestamp}`;
    
    try {
      // Converte a chave pública de hex para buffer
      const publicKeyBuffer = Buffer.from(fromWallet.publicKey, 'hex');
      
      // Cria um objeto de chave pública
      const publicKey = crypto.createPublicKey({
        key: publicKeyBuffer,
        format: 'der',
        type: 'spki'
      });
      
      // Verifica a assinatura
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
   * Atualiza o saldo de uma carteira
   * @param address Endereço da carteira
   * @param newBalance Novo saldo
   */
  updateBalance(address: string, newBalance: number): void {
    const wallet = this.wallets.get(address);
    if (wallet) {
      wallet.balance = newBalance;
      this.saveWallet(wallet);
    }
  }

  /**
   * Calcula o saldo de todas as carteiras com base na blockchain
   * @param blockchain Instância da blockchain
   */
  calculateBalances(blockchain: any): void {
    // Reseta todos os saldos para zero
    for (const wallet of this.wallets.values()) {
      wallet.balance = 0;
    }
    
    // Obtém todas as transações da blockchain
    const transactions = blockchain.getTransactionsByType('transaction');
    
    // Processa cada transação
    for (const tx of transactions) {
      const payload = tx.payload as any;
      
      // Verifica se a transação tem os campos necessários
      if (payload.from && payload.to && payload.amount) {
        // Subtrai do remetente
        const fromWallet = this.wallets.get(payload.from);
        if (fromWallet) {
          fromWallet.balance -= payload.amount;
        }
        
        // Adiciona ao destinatário
        const toWallet = this.wallets.get(payload.to);
        if (toWallet) {
          toWallet.balance += payload.amount;
        }
      }
    }
    
    // Salva todas as carteiras com os saldos atualizados
    for (const wallet of this.wallets.values()) {
      this.saveWallet(wallet);
    }
  }

  /**
   * Importa uma carteira a partir de uma seed phrase (mnemônico)
   * @param mnemonic Seed phrase (12 palavras)
   * @param label Nome amigável para a carteira
   * @returns A carteira importada com seed phrase
   */
  importWalletFromMnemonic(mnemonic: string, label: string = 'Carteira Importada'): WalletWithSeed {
    try {
      // Verifica se o mnemônico é válido
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Seed phrase inválida');
      }
      
      // Deriva as chaves a partir do mnemônico
      const { privateKey, publicKey } = this.deriveKeysFromMnemonic(mnemonic);
      
      // Gera o endereço a partir da chave pública
      const address = this.generateReadableAddress(publicKey);
      
      // Verifica se a carteira já existe
      if (this.wallets.has(address)) {
        const existingWallet = this.wallets.get(address)!;
        
        // Retorna a carteira existente com a seed phrase e chave privada
        return {
          ...existingWallet,
          mnemonic,
          privateKey
        };
      }
      
      // Cria a carteira com seed phrase
      const walletWithSeed: WalletWithSeed = {
        address,
        publicKey,
        privateKey,
        mnemonic,
        label,
        balance: 0,
        createdAt: Date.now()
      };
      
      // Cria a versão da carteira para armazenamento (sem chave privada e mnemônico)
      const wallet: Wallet = {
        address,
        publicKey,
        label,
        balance: 0,
        createdAt: Date.now()
      };
      
      // Salva a carteira (sem a chave privada e mnemônico)
      this.saveWallet(wallet);
      
      // Adiciona a carteira ao mapa
      this.wallets.set(address, wallet);
      
      // Retorna a carteira completa com seed phrase e chave privada
      return walletWithSeed;
    } catch (error: any) {
      throw new Error(`Erro ao importar carteira: ${error.message}`);
    }
  }
  
  /**
   * Importa uma carteira a partir de uma chave privada
   * @param privateKeyHex Chave privada em formato hexadecimal
   * @param label Nome amigável para a carteira
   * @returns A carteira importada
   */
  importWallet(privateKeyHex: string, label: string = 'Carteira Importada'): Wallet {
    try {
      // Converte a chave privada de hex para buffer
      const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
      
      // Cria um objeto HDKey a partir da chave privada
      const hdkey = new HDKey();
      hdkey.privateKey = privateKeyBuffer;
      
      // Obtém a chave pública
      const publicKey = hdkey.publicKey.toString('hex');
      
      // Gera o endereço a partir da chave pública
      const address = this.generateReadableAddress(publicKey);
      
      // Verifica se a carteira já existe
      if (this.wallets.has(address)) {
        return this.wallets.get(address)!;
      }
      
      // Cria a carteira (sem a chave privada)
      const wallet: Wallet = {
        address,
        publicKey,
        label,
        balance: 0,
        createdAt: Date.now()
      };
      
      // Salva a carteira
      this.saveWallet(wallet);
      
      // Adiciona a carteira ao mapa
      this.wallets.set(address, wallet);
      
      // Retorna a carteira com a chave privada
      return {
        ...wallet,
        privateKey: privateKeyHex
      } as WalletWithSeed;
    } catch (error: any) {
      throw new Error(`Erro ao importar carteira: ${error.message}`);
    }
  }

  /**
   * Recupera uma carteira a partir de uma seed phrase
   * @param mnemonic Seed phrase (12 palavras)
   * @returns A carteira recuperada com seed phrase e chave privada
   */
  recoverWalletFromMnemonic(mnemonic: string): WalletWithSeed {
    return this.importWalletFromMnemonic(mnemonic);
  }
  
  /**
   * Exporta uma carteira (retorna apenas a seed phrase)
   * @param address Endereço da carteira
   * @returns Seed phrase da carteira
   */
  exportWallet(address: string): string {
    // Na implementação real, a seed phrase não é armazenada
    // O usuário deve guardar sua própria seed phrase
    throw new Error('A seed phrase não é armazenada no servidor. O usuário deve guardar sua própria seed phrase.');
  }

  /**
   * Cria uma transação entre carteiras
   * @param fromAddress Endereço da carteira de origem
   * @param toAddress Endereço da carteira de destino
   * @param amount Quantidade a transferir
   * @param privateKeyHex Chave privada da carteira de origem em formato hexadecimal (deve ser fornecida pelo usuário)
   * @returns A transação criada
   */
  createTransaction(fromAddress: string, toAddress: string, amount: number, privateKeyHex?: string): WalletTransaction {
    // Verifica se as carteiras existem
    const fromWallet = this.wallets.get(fromAddress);
    if (!fromWallet) {
      throw new Error(`Carteira de origem não encontrada: ${fromAddress}`);
    }
    
    if (!this.wallets.has(toAddress) && !this.isValidAddress(toAddress)) {
      throw new Error(`Carteira de destino inválida: ${toAddress}`);
    }
    
    // Verifica se a carteira tem saldo suficiente
    if (fromWallet.balance < amount) {
      throw new Error(`Saldo insuficiente. Disponível: ${fromWallet.balance}, Necessário: ${amount}`);
    }
    
    // Cria a transação
    const transaction: WalletTransaction = {
      from: fromAddress,
      to: toAddress,
      amount,
      timestamp: Date.now()
    };
    
    // Se a chave privada foi fornecida, assina a transação
    if (privateKeyHex) {
      transaction.signature = this.signTransaction(transaction, privateKeyHex);
    }
    
    return transaction;
  }

  /**
   * Remove uma carteira
   * @param address Endereço da carteira
   * @returns true se a carteira foi removida
   */
  removeWallet(address: string): boolean {
    const wallet = this.wallets.get(address);
    if (!wallet) {
      return false;
    }
    
    // Remove do mapa
    this.wallets.delete(address);
    
    // Remove o arquivo
    const filePath = path.join(this.walletsDir, `${address}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return true;
  }
}
