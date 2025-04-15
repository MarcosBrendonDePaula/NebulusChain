/**
 * Hash.ts
 * Funções utilitárias para geração de hashes
 */

import { createHash } from 'crypto';

/**
 * Gera um hash SHA-256 para os dados fornecidos
 * @param data Dados a serem hasheados
 * @returns Hash SHA-256 em formato hexadecimal
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Gera um hash para um arquivo
 * @param fileContent Conteúdo do arquivo
 * @returns Hash SHA-256 em formato hexadecimal
 */
export function hashFile(fileContent: Buffer): string {
  return createHash('sha256').update(fileContent).digest('hex');
}

/**
 * Verifica se um hash corresponde aos dados
 * @param data Dados originais
 * @param hash Hash a ser verificado
 * @returns true se o hash corresponder aos dados, false caso contrário
 */
export function verifyHash(data: string, hash: string): boolean {
  const calculatedHash = hashData(data);
  return calculatedHash === hash;
}
