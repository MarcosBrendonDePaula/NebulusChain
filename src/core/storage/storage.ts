/**
 * Storage.ts
 * Gerencia o armazenamento local de arquivos e dados
 */

import * as fs from 'fs';
import * as path from 'path';
import { hashFile } from '../utils/hash';

export class Storage {
  private storageDir: string;

  /**
   * Construtor da classe Storage
   * @param storageDir Diretório para armazenamento de arquivos
   */
  constructor(storageDir: string = './data/storage') {
    this.storageDir = storageDir;
    
    // Cria o diretório de armazenamento se não existir
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
  }

  /**
   * Armazena um arquivo e retorna seu hash
   * @param filePath Caminho do arquivo a ser armazenado
   * @returns Hash do arquivo armazenado
   */
  storeFile(filePath: string): string {
    // Lê o arquivo
    const fileContent = fs.readFileSync(filePath);
    
    // Calcula o hash do arquivo
    const fileHash = hashFile(fileContent);
    
    // Define o caminho de destino baseado no hash
    const destinationPath = path.join(this.storageDir, fileHash);
    
    // Armazena o arquivo
    fs.writeFileSync(destinationPath, fileContent);
    
    console.log(`Arquivo armazenado com hash: ${fileHash}`);
    return fileHash;
  }

  /**
   * Armazena dados em formato de buffer e retorna seu hash
   * @param data Dados a serem armazenados
   * @returns Hash dos dados armazenados
   */
  storeData(data: Buffer): string {
    // Calcula o hash dos dados
    const dataHash = hashFile(data);
    
    // Define o caminho de destino baseado no hash
    const destinationPath = path.join(this.storageDir, dataHash);
    
    // Armazena os dados
    fs.writeFileSync(destinationPath, data);
    
    console.log(`Dados armazenados com hash: ${dataHash}`);
    return dataHash;
  }

  /**
   * Armazena uma string e retorna seu hash
   * @param content Conteúdo a ser armazenado
   * @returns Hash do conteúdo armazenado
   */
  storeString(content: string): string {
    return this.storeData(Buffer.from(content, 'utf8'));
  }

  /**
   * Armazena um objeto JSON e retorna seu hash
   * @param data Objeto a ser armazenado
   * @returns Hash do objeto armazenado
   */
  storeJSON(data: object): string {
    return this.storeString(JSON.stringify(data));
  }

  /**
   * Recupera dados pelo hash
   * @param hash Hash dos dados a serem recuperados
   * @returns Buffer com os dados ou null se não encontrado
   */
  retrieveData(hash: string): Buffer | null {
    const filePath = path.join(this.storageDir, hash);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    
    console.error(`Dados com hash ${hash} não encontrados.`);
    return null;
  }

  /**
   * Recupera uma string pelo hash
   * @param hash Hash da string a ser recuperada
   * @returns String recuperada ou null se não encontrada
   */
  retrieveString(hash: string): string | null {
    const data = this.retrieveData(hash);
    
    if (data) {
      return data.toString('utf8');
    }
    
    return null;
  }

  /**
   * Recupera um objeto JSON pelo hash
   * @param hash Hash do objeto a ser recuperado
   * @returns Objeto recuperado ou null se não encontrado
   */
  retrieveJSON(hash: string): object | null {
    const data = this.retrieveString(hash);
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error(`Erro ao analisar JSON: ${error}`);
      }
    }
    
    return null;
  }

  /**
   * Verifica se um hash existe no armazenamento
   * @param hash Hash a ser verificado
   * @returns true se o hash existir, false caso contrário
   */
  exists(hash: string): boolean {
    return fs.existsSync(path.join(this.storageDir, hash));
  }

  /**
   * Remove dados pelo hash
   * @param hash Hash dos dados a serem removidos
   * @returns true se os dados foram removidos, false caso contrário
   */
  removeData(hash: string): boolean {
    const filePath = path.join(this.storageDir, hash);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Dados com hash ${hash} removidos.`);
      return true;
    }
    
    console.error(`Dados com hash ${hash} não encontrados para remoção.`);
    return false;
  }

  /**
   * Lista todos os hashes armazenados
   * @returns Array com todos os hashes
   */
  listAllHashes(): string[] {
    return fs.readdirSync(this.storageDir);
  }
}
