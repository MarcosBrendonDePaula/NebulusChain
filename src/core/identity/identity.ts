/**
 * Identity.ts
 * Gerencia identidades e pares de chaves criptográficas
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class Identity {
  private keyPair: KeyPair | null = null;
  private keyPath: string;

  /**
   * Construtor da classe Identity
   * @param keyPath Caminho para armazenar as chaves
   */
  constructor(keyPath: string = './data/keys') {
    this.keyPath = keyPath;
    
    // Cria o diretório de chaves se não existir
    if (!fs.existsSync(keyPath)) {
      fs.mkdirSync(keyPath, { recursive: true });
    }
  }

  /**
   * Inicializa a identidade, carregando ou gerando chaves
   */
  async initialize(): Promise<void> {
    const privateKeyPath = path.join(this.keyPath, 'private.pem');
    const publicKeyPath = path.join(this.keyPath, 'public.pem');

    // Verifica se as chaves já existem
    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      // Carrega as chaves existentes
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      
      this.keyPair = {
        privateKey,
        publicKey
      };
      
      console.log('Chaves criptográficas carregadas com sucesso.');
    } else {
      // Gera um novo par de chaves
      await this.generateKeyPair();
      console.log('Novas chaves criptográficas geradas com sucesso.');
    }
  }

  /**
   * Gera um novo par de chaves RSA
   */
  private async generateKeyPair(): Promise<void> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Salva as chaves em arquivos
        fs.writeFileSync(path.join(this.keyPath, 'private.pem'), privateKey);
        fs.writeFileSync(path.join(this.keyPath, 'public.pem'), publicKey);
        
        this.keyPair = {
          privateKey,
          publicKey
        };
        
        resolve();
      });
    });
  }

  /**
   * Obtém a chave pública
   * @returns A chave pública em formato PEM
   */
  getPublicKey(): string {
    if (!this.keyPair) {
      throw new Error('Identidade não inicializada. Chame initialize() primeiro.');
    }
    
    return this.keyPair.publicKey;
  }

  /**
   * Assina dados com a chave privada
   * @param data Dados a serem assinados
   * @returns Assinatura em formato base64
   */
  sign(data: string): string {
    if (!this.keyPair) {
      throw new Error('Identidade não inicializada. Chame initialize() primeiro.');
    }
    
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    
    return sign.sign(this.keyPair.privateKey, 'base64');
  }

  /**
   * Verifica uma assinatura
   * @param data Dados originais
   * @param signature Assinatura a ser verificada
   * @param publicKey Chave pública para verificação
   * @returns true se a assinatura for válida, false caso contrário
   */
  static verify(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    
    try {
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      return false;
    }
  }
}
