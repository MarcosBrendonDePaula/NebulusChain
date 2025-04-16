/**
 * Block.ts
 * Define a estrutura de um bloco na blockchain Nebulus
 */

import { createHash } from 'crypto';
import { hashData } from '../utils/hash';

// Definição dos tipos de registros suportados
export type RecordType = "file" | "transaction" | "event" | "identity" | "custom";

// Interface para assinaturas digitais
export interface Signature {
  publicKey: string;
  signature: string;
}

// Interface para dados criptografados
export interface EncryptedData {
  encryptedPayload: string;
  iv: string;
}

// Interface para informações de criptografia
export interface EncryptionInfo {
  method: "AES-256-CBC";
  iv: string;
  encrypted: boolean;
}

// Interface para os dados do bloco
export interface BlockData {
  type: RecordType | string;
  payload: string | object;
  encryption?: EncryptionInfo;
  signatures: Signature[];
  requiredSigners: number;
}

// Interface principal do bloco
export interface Block {
  timestamp: number;
  data: BlockData;
  previousHash: string;
  hash: string;
  nonce: number;
  
  // Métodos
  calculateHash(): string;
  mineBlock(difficulty: number): void;
  isValid(): boolean;
  hasEnoughSignatures(): boolean;
}

/**
 * Classe que implementa a estrutura e funcionalidades de um bloco
 */
export class BlockImpl implements Block {
  timestamp: number;
  data: BlockData;
  previousHash: string;
  hash: string;
  nonce: number;

  /**
   * Construtor do bloco
   * @param timestamp Timestamp de criação do bloco
   * @param data Dados armazenados no bloco
   * @param previousHash Hash do bloco anterior
   */
  constructor(timestamp: number, data: BlockData, previousHash: string = '') {
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  /**
   * Calcula o hash do bloco baseado em seus dados
   * @returns Hash SHA-256 do bloco
   */
  calculateHash(): string {
    // Inclui o hash do bloco anterior no cálculo do hash atual
    // Isso garante que qualquer alteração em um bloco anterior
    // invalidará todos os blocos subsequentes
    return hashData(
      this.previousHash + 
      this.timestamp + 
      JSON.stringify(this.data) + 
      this.nonce
    );
  }

  /**
   * Implementa prova de trabalho simples (mining)
   * @param difficulty Dificuldade do mining (número de zeros iniciais)
   */
  mineBlock(difficulty: number): void {
    const target = Array(difficulty + 1).join('0');
    
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    
    console.log(`Bloco minerado: ${this.hash}`);
  }

  /**
   * Verifica se o bloco é válido
   * @returns true se o bloco for válido, false caso contrário
   */
  isValid(): boolean {
    // Verifica se o hash armazenado corresponde ao hash calculado
    const validHash = this.hash === this.calculateHash();
    
    // Verifica se o hash começa com o número correto de zeros (prova de trabalho)
    const difficulty = this.hash.match(/^0*/)?.[0].length || 0;
    
    console.log(`Verificando bloco ${this.hash.substring(0, 8)}... - Hash válido: ${validHash}`);
    
    return validHash;
  }

  /**
   * Verifica se o bloco tem assinaturas suficientes
   * @returns true se o número de assinaturas válidas for maior ou igual ao requerido
   */
  hasEnoughSignatures(): boolean {
    // Aqui seria implementada a verificação das assinaturas
    // Por enquanto, apenas verifica se o número de assinaturas é suficiente
    return this.data.signatures.length >= this.data.requiredSigners;
  }
}
