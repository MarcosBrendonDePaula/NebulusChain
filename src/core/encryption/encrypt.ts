/**
 * Encrypt.ts
 * Implementa funções de criptografia e descriptografia
 */

import * as crypto from 'crypto';

// Algoritmo de criptografia
const ALGORITHM = 'aes-256-cbc';

/**
 * Interface para dados criptografados
 */
export interface EncryptedResult {
  encryptedData: string;
  iv: string;
  token: string; // Chave secreta para descriptografia
}

/**
 * Criptografa dados usando AES-256-CBC
 * @param data Dados a serem criptografados
 * @returns Objeto com dados criptografados, IV e token
 */
export function encrypt(data: string | object): EncryptedResult {
  // Converte objeto para string se necessário
  const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
  
  // Gera uma chave aleatória de 32 bytes (256 bits)
  const key = crypto.randomBytes(32);
  
  // Gera um vetor de inicialização aleatório de 16 bytes
  const iv = crypto.randomBytes(16);
  
  // Cria o cipher com o algoritmo, chave e IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Criptografa os dados
  let encrypted = cipher.update(dataString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    token: key.toString('hex') // Token é a chave em formato hexadecimal
  };
}

/**
 * Descriptografa dados usando AES-256-CBC
 * @param encryptedData Dados criptografados
 * @param iv Vetor de inicialização
 * @param token Chave secreta para descriptografia
 * @returns Dados descriptografados
 */
export function decrypt(encryptedData: string, iv: string, token: string): string {
  try {
    // Converte o IV e o token de hexadecimal para Buffer
    const ivBuffer = Buffer.from(iv, 'hex');
    const keyBuffer = Buffer.from(token, 'hex');
    
    // Cria o decipher com o algoritmo, chave e IV
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    
    // Descriptografa os dados
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    throw new Error('Falha na descriptografia. Verifique o token e o IV.');
  }
}

/**
 * Tenta analisar dados descriptografados como JSON
 * @param decryptedData Dados descriptografados
 * @returns Objeto JSON ou string original
 */
export function parseDecryptedData(decryptedData: string): any {
  try {
    return JSON.parse(decryptedData);
  } catch (error) {
    // Se não for um JSON válido, retorna a string original
    return decryptedData;
  }
}

/**
 * Gera um hash para uma senha
 * @param password Senha a ser hasheada
 * @param salt Sal para o hash (opcional)
 * @returns Hash da senha
 */
export function hashPassword(password: string, salt?: string): { hash: string, salt: string } {
  // Gera um sal aleatório se não for fornecido
  const passwordSalt = salt || crypto.randomBytes(16).toString('hex');
  
  // Gera o hash usando PBKDF2
  const hash = crypto.pbkdf2Sync(
    password,
    passwordSalt,
    10000, // Número de iterações
    64,    // Comprimento da chave
    'sha512'
  ).toString('hex');
  
  return {
    hash,
    salt: passwordSalt
  };
}

/**
 * Verifica se uma senha corresponde a um hash
 * @param password Senha a ser verificada
 * @param hash Hash armazenado
 * @param salt Sal usado para gerar o hash
 * @returns true se a senha corresponder ao hash, false caso contrário
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const hashVerify = hashPassword(password, salt);
  return hashVerify.hash === hash;
}
