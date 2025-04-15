/**
 * Bootstrap.ts
 * Gerencia a lista de nós bootstrap para conexão inicial
 */

import * as fs from 'fs';
import * as path from 'path';

// Porta padrão para conexões P2P (menos usual)
export const DEFAULT_P2P_PORT = 42422;

// IP de teste padrão
const DEFAULT_TEST_IP = '192.168.1.22';

// URL para obter a lista de nós bootstrap
const BOOTSTRAP_LIST_URL = 'https://nebulus-network.example.com/bootstrap-nodes.json';

// Caminho para o arquivo de cache local
const CACHE_FILE_PATH = './data/bootstrap-cache.json';

/**
 * Interface para um nó bootstrap
 */
export interface BootstrapNode {
  ip: string;
  port: number;
  id?: string;
  lastSeen?: number;
}

/**
 * Converte um nó bootstrap para formato multiaddr
 * @param node Nó bootstrap
 * @returns Endereço multiaddr
 */
export function nodeToMultiaddr(node: BootstrapNode): string {
  return `/ip4/${node.ip}/tcp/${node.port}`;
}

/**
 * Classe para gerenciar a lista de nós bootstrap
 */
export class BootstrapManager {
  private nodes: BootstrapNode[] = [];
  private cacheFilePath: string;

  /**
   * Construtor da classe BootstrapManager
   * @param cacheFilePath Caminho para o arquivo de cache (opcional)
   */
  constructor(cacheFilePath: string = CACHE_FILE_PATH) {
    this.cacheFilePath = cacheFilePath;
    
    // Cria o diretório de cache se não existir
    const cacheDir = path.dirname(cacheFilePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * Inicializa a lista de nós bootstrap
   */
  async initialize(): Promise<void> {
    try {
      // Tenta obter a lista de nós bootstrap da web
      await this.fetchBootstrapList();
    } catch (error) {
      console.warn('Erro ao obter lista de nós bootstrap da web:', error);
      console.log('Usando lista de cache local...');
      
      // Se falhar, carrega a lista de cache
      this.loadCachedList();
    }
    
    // Se a lista ainda estiver vazia, usa o nó de teste padrão
    if (this.nodes.length === 0) {
      console.log('Nenhum nó bootstrap encontrado. Usando nó de teste padrão.');
      this.nodes = [
        {
          ip: DEFAULT_TEST_IP,
          port: DEFAULT_P2P_PORT
        }
      ];
      
      // Salva a lista padrão no cache
      this.saveCachedList();
    }
    
    console.log(`Lista de nós bootstrap inicializada com ${this.nodes.length} nós.`);
  }

  /**
   * Obtém a lista de nós bootstrap da web
   */
  private async fetchBootstrapList(): Promise<void> {
    try {
      // Simulação de requisição HTTP
      // Em uma implementação real, seria usado fetch ou outro método para obter a lista
      console.log(`Obtendo lista de nós bootstrap de ${BOOTSTRAP_LIST_URL}...`);
      
      // Simula um erro para testar o fallback para o cache
      throw new Error('Simulação de erro na requisição HTTP');
      
      // Código que seria executado em uma implementação real:
      // const response = await fetch(BOOTSTRAP_LIST_URL);
      // if (!response.ok) {
      //   throw new Error(`Erro HTTP: ${response.status}`);
      // }
      // const data = await response.json();
      // this.nodes = data.nodes;
      
      // Salva a lista obtida no cache
      // this.saveCachedList();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Carrega a lista de nós bootstrap do cache local
   */
  private loadCachedList(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const cacheData = fs.readFileSync(this.cacheFilePath, 'utf8');
        const cachedNodes = JSON.parse(cacheData);
        
        if (Array.isArray(cachedNodes) && cachedNodes.length > 0) {
          this.nodes = cachedNodes;
          console.log(`Lista de cache carregada com ${this.nodes.length} nós.`);
          return;
        }
      }
      
      console.warn('Arquivo de cache não encontrado ou vazio.');
      this.nodes = [];
    } catch (error) {
      console.error('Erro ao carregar lista de cache:', error);
      this.nodes = [];
    }
  }

  /**
   * Salva a lista de nós bootstrap no cache local
   */
  private saveCachedList(): void {
    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.nodes, null, 2));
      console.log('Lista de nós bootstrap salva no cache.');
    } catch (error) {
      console.error('Erro ao salvar lista de cache:', error);
    }
  }

  /**
   * Obtém a lista de nós bootstrap
   * @returns Lista de nós bootstrap
   */
  getNodes(): BootstrapNode[] {
    return [...this.nodes];
  }

  /**
   * Obtém a lista de nós bootstrap em formato multiaddr
   * @returns Lista de endereços multiaddr
   */
  getMultiaddrs(): string[] {
    return this.nodes.map(nodeToMultiaddr);
  }

  /**
   * Adiciona um nó à lista de bootstrap
   * @param node Nó a ser adicionado
   */
  addNode(node: BootstrapNode): void {
    // Verifica se o nó já existe na lista
    const exists = this.nodes.some(n => n.ip === node.ip && n.port === node.port);
    
    if (!exists) {
      this.nodes.push(node);
      this.saveCachedList();
      console.log(`Nó adicionado à lista de bootstrap: ${nodeToMultiaddr(node)}`);
    }
  }

  /**
   * Remove um nó da lista de bootstrap
   * @param ip IP do nó
   * @param port Porta do nó
   */
  removeNode(ip: string, port: number): void {
    const initialLength = this.nodes.length;
    this.nodes = this.nodes.filter(n => !(n.ip === ip && n.port === port));
    
    if (this.nodes.length < initialLength) {
      this.saveCachedList();
      console.log(`Nó removido da lista de bootstrap: /ip4/${ip}/tcp/${port}`);
    }
  }

  /**
   * Atualiza o timestamp de último contato com um nó
   * @param ip IP do nó
   * @param port Porta do nó
   */
  updateNodeLastSeen(ip: string, port: number): void {
    const node = this.nodes.find(n => n.ip === ip && n.port === port);
    
    if (node) {
      node.lastSeen = Date.now();
      this.saveCachedList();
    }
  }
}
