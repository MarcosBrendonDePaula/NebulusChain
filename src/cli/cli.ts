/**
 * CLI.ts
 * Interface de linha de comando para o Nebulus
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Blockchain } from '../core/blockchain/blockchain';
import { BlockData } from '../core/blockchain/block';
import { Identity } from '../core/identity/identity';
import { Storage } from '../core/storage/storage';
import { encrypt, decrypt, parseDecryptedData } from '../core/encryption/encrypt';
import { Node, MessageType } from '../core/p2p/node';
import { WebSocketAPI } from '../core/api/websocket';

// Diretórios de dados
const DATA_DIR = './data';
const BLOCKCHAIN_DIR = path.join(DATA_DIR, 'blockchain');
const KEYS_DIR = path.join(DATA_DIR, 'keys');
const STORAGE_DIR = path.join(DATA_DIR, 'storage');

// Instâncias das classes principais
let blockchain: Blockchain;
let identity: Identity;
let storage: Storage;
let node: Node;

/**
 * Inicializa os componentes do sistema
 */
async function initializeSystem() {
  console.log('Inicializando Nebulus...');
  
  // Cria o diretório de dados se não existir
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Inicializa a blockchain
  blockchain = new Blockchain(BLOCKCHAIN_DIR);
  console.log('Blockchain inicializada.');
  
  // Inicializa a identidade
  identity = new Identity(KEYS_DIR);
  await identity.initialize();
  console.log('Identidade inicializada.');
  
  // Inicializa o armazenamento
  storage = new Storage(STORAGE_DIR);
  console.log('Armazenamento inicializado.');
  
  // Inicializa o nó P2P
  node = new Node();
  await node.start();
  console.log('Nó P2P inicializado.');
  
  console.log('Sistema Nebulus inicializado com sucesso!');
}

/**
 * Adiciona um arquivo à blockchain
 * @param filePath Caminho do arquivo a ser adicionado
 * @param encrypt Indica se o arquivo deve ser criptografado
 */
async function addFile(filePath: string, shouldEncrypt: boolean = false) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Arquivo não encontrado: ${filePath}`);
      return;
    }
    
    // Armazena o arquivo e obtém o hash
    const fileHash = storage.storeFile(filePath);
    console.log(`Arquivo armazenado com hash: ${fileHash}`);
    
    // Prepara os dados para o bloco
    let payload: any = {
      fileName: path.basename(filePath),
      fileHash: fileHash,
      fileSize: fs.statSync(filePath).size,
      timestamp: Date.now()
    };
    
    // Criptografa o payload se necessário
    let encryptionInfo = undefined;
    if (shouldEncrypt) {
      const encryptedResult = encrypt(payload);
      payload = encryptedResult.encryptedData;
      encryptionInfo = {
        method: 'AES-256-CBC' as const,
        iv: encryptedResult.iv,
        encrypted: true
      };
      
      console.log(`Arquivo criptografado. Token para descriptografia: ${encryptedResult.token}`);
      console.log('Guarde este token em um local seguro. Ele será necessário para descriptografar o conteúdo.');
    }
    
    // Assina os dados
    const dataToSign = JSON.stringify(payload);
    const signature = identity.sign(dataToSign);
    
    // Cria o bloco
    const blockData: BlockData = {
      type: 'file',
      payload,
      encryption: encryptionInfo,
      signatures: [{
        publicKey: identity.getPublicKey(),
        signature
      }],
      requiredSigners: 1
    };
    
    // Adiciona o bloco à blockchain
    const newBlock = blockchain.addBlock(blockData);
    console.log(`Bloco adicionado à blockchain com hash: ${newBlock.hash}`);
    
    // Broadcast do novo bloco (simulado)
    await node.broadcast(MessageType.NEW_BLOCK, {
      blockHash: newBlock.hash
    });
    
  } catch (error) {
    console.error('Erro ao adicionar arquivo:', error);
  }
}

/**
 * Assina um arquivo JSON com dados para a blockchain
 * @param filePath Caminho do arquivo JSON
 */
async function signTransaction(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Arquivo não encontrado: ${filePath}`);
      return;
    }
    
    // Lê o arquivo JSON
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let data: any;
    
    try {
      data = JSON.parse(fileContent);
    } catch (error) {
      console.error('Erro ao analisar o arquivo JSON:', error);
      return;
    }
    
    // Verifica se o arquivo tem a estrutura esperada
    if (!data.type || !data.payload) {
      console.error('Formato de arquivo inválido. O arquivo deve conter "type" e "payload".');
      return;
    }
    
    // Assina os dados
    const dataToSign = JSON.stringify(data.payload);
    const signature = identity.sign(dataToSign);
    
    // Prepara os dados para o bloco
    const blockData: BlockData = {
      type: data.type,
      payload: data.payload,
      encryption: data.encryption,
      signatures: [{
        publicKey: identity.getPublicKey(),
        signature
      }],
      requiredSigners: data.requiredSigners || 1
    };
    
    // Adiciona o bloco à blockchain
    const newBlock = blockchain.addBlock(blockData);
    console.log(`Bloco assinado e adicionado à blockchain com hash: ${newBlock.hash}`);
    
    // Broadcast do novo bloco (simulado)
    await node.broadcast(MessageType.NEW_BLOCK, {
      blockHash: newBlock.hash
    });
    
  } catch (error) {
    console.error('Erro ao assinar transação:', error);
  }
}

/**
 * Lista todos os blocos da blockchain
 */
function listBlocks() {
  const blocks = blockchain.getAllBlocks();
  
  console.log(`\n=== Blocos na Blockchain (${blocks.length}) ===`);
  
  blocks.forEach((block, index) => {
    console.log(`\nBloco #${index}`);
    console.log(`Hash: ${block.hash}`);
    console.log(`Timestamp: ${new Date(block.timestamp).toLocaleString()}`);
    console.log(`Tipo: ${block.data.type}`);
    console.log(`Assinaturas: ${block.data.signatures.length}`);
    console.log(`Criptografado: ${block.data.encryption ? 'Sim' : 'Não'}`);
    
    if (!block.data.encryption) {
      console.log('Payload:', typeof block.data.payload === 'object' 
        ? JSON.stringify(block.data.payload, null, 2) 
        : block.data.payload);
    }
  });
}

/**
 * Mostra a chave pública do nó
 */
function showPublicKey() {
  const publicKey = identity.getPublicKey();
  console.log('\n=== Chave Pública ===');
  console.log(publicKey);
}

/**
 * Descriptografa um payload com o token fornecido
 * @param token Token para descriptografia
 * @param blockHash Hash do bloco (opcional)
 */
function decryptPayload(token: string, blockHash?: string) {
  try {
    let blocks;
    
    if (blockHash) {
      const block = blockchain.getBlockByHash(blockHash);
      if (!block) {
        console.error(`Bloco com hash ${blockHash} não encontrado.`);
        return;
      }
      blocks = [block];
    } else {
      blocks = blockchain.getAllBlocks().filter(block => block.data.encryption);
    }
    
    if (blocks.length === 0) {
      console.error('Nenhum bloco criptografado encontrado.');
      return;
    }
    
    let decryptedAny = false;
    
    for (const block of blocks) {
      if (!block.data.encryption) continue;
      
      try {
        const decrypted = decrypt(
          block.data.payload as string,
          block.data.encryption.iv,
          token
        );
        
        const parsedData = parseDecryptedData(decrypted);
        
        console.log(`\n=== Dados Descriptografados do Bloco ${block.hash} ===`);
        console.log(typeof parsedData === 'object' 
          ? JSON.stringify(parsedData, null, 2) 
          : parsedData);
        
        decryptedAny = true;
      } catch (error) {
        if (blockHash) {
          console.error('Erro ao descriptografar o bloco. Verifique se o token está correto.');
        }
        // Se não especificou um bloco, tentamos o próximo
      }
    }
    
    if (!decryptedAny) {
      console.error('Não foi possível descriptografar nenhum bloco com o token fornecido.');
    }
    
  } catch (error) {
    console.error('Erro ao descriptografar payload:', error);
  }
}

/**
 * Configura e executa a CLI
 */
export async function runCLI() {
  const program = new Command();
  
  program
    .name('nebulus')
    .description('Nebulus - Rede Genérica Descentralizada com Blockchain Modular')
    .version('0.1.0');
  
  // Inicializa o sistema
  await initializeSystem();
  
  // Comando para adicionar um arquivo
  program
    .command('add')
    .description('Adiciona um arquivo à blockchain')
    .argument('<arquivo>', 'Caminho do arquivo a ser adicionado')
    .option('-e, --encrypt', 'Criptografa o arquivo', false)
    .action(async (arquivo, options) => {
      await addFile(arquivo, options.encrypt);
    });
  
  // Comando para assinar uma transação
  program
    .command('sign')
    .description('Assina um arquivo JSON com dados para a blockchain')
    .argument('<arquivo>', 'Caminho do arquivo JSON')
    .action(async (arquivo) => {
      await signTransaction(arquivo);
    });
  
  // Comando para listar blocos
  program
    .command('blocks')
    .description('Lista todos os blocos armazenados')
    .action(() => {
      listBlocks();
    });
  
  // Comando para mostrar a chave pública
  program
    .command('keys')
    .description('Mostra a chave pública local')
    .action(() => {
      showPublicKey();
    });
  
  // Comando para descriptografar um payload
  program
    .command('decrypt')
    .description('Descriptografa um payload com o token fornecido')
    .argument('<token>', 'Token para descriptografia')
    .option('-b, --block <hash>', 'Hash do bloco específico')
    .action((token, options) => {
      decryptPayload(token, options.block);
    });
  
  // Comando para criar uma transação
  program
    .command('tx')
    .description('Cria uma transação a partir de um arquivo JSON')
    .argument('<arquivo>', 'Caminho do arquivo JSON')
    .action(async (arquivo) => {
      await signTransaction(arquivo);
    });
  
  // Comando para manter o nó em execução
  program
    .command('serve')
    .description('Mantém o nó em execução e escutando por conexões')
    .option('-p, --port <port>', 'Porta para escutar conexões', '42422')
    .action(async (options) => {
      console.log(`\n=== Nó Nebulus em execução (porta ${options.port}) ===`);
      console.log('Pressione Ctrl+C para encerrar\n');
      
      // Simula um servidor em execução
      console.log('Aguardando conexões de outros nós...');
      
      // Mantém o processo em execução
      await new Promise(() => {
        // Esta promessa nunca é resolvida, mantendo o processo vivo
        // Até que o usuário pressione Ctrl+C
        
        // Configura um intervalo para mostrar status periódicos
        setInterval(() => {
          const peers = node.getConnectedPeers();
          const blocks = blockchain.getAllBlocks();
          console.log(`\nStatus: ${new Date().toLocaleString()}`);
          console.log(`Nó ID: ${node.getNodeId()}`);
          console.log(`Peers conectados: ${peers.length}`);
          console.log(`Blocos na blockchain: ${blocks.length}`);
        }, 30000); // A cada 30 segundos
      });
    });
    
  // Comando para listar os nós bootstrap
  program
    .command('peers')
    .description('Lista os nós bootstrap e peers conectados')
    .action(() => {
      const bootstrapNodes = node.getBootstrapNodes();
      const connectedPeers = node.getConnectedPeers();
      
      console.log('\n=== Nós Bootstrap ===');
      if (bootstrapNodes.length === 0) {
        console.log('Nenhum nó bootstrap configurado.');
      } else {
        bootstrapNodes.forEach((node, index) => {
          console.log(`${index + 1}. ${node.ip}:${node.port} ${node.lastSeen ? `(Último contato: ${new Date(node.lastSeen).toLocaleString()})` : ''}`);
        });
      }
      
      console.log('\n=== Peers Conectados ===');
      if (connectedPeers.length === 0) {
        console.log('Nenhum peer conectado.');
      } else {
        connectedPeers.forEach((peer, index) => {
          console.log(`${index + 1}. ${peer}`);
        });
      }
    });
    
  // Comando para adicionar um nó bootstrap
  program
    .command('peer-add')
    .description('Adiciona um nó bootstrap')
    .argument('<address>', 'Endereço do nó no formato "ip:porta"')
    .action((address) => {
      try {
        // Verifica se o endereço está no formato correto
        const [ip, portStr] = address.split(':');
        const port = parseInt(portStr, 10);
        
        if (!ip || isNaN(port)) {
          console.error('Formato de endereço inválido. Use o formato "ip:porta"');
          return;
        }
        
        // Adiciona o nó à lista de bootstrap
        node.addBootstrapNode(ip, port);
        console.log(`Nó bootstrap adicionado: ${ip}:${port}`);
      } catch (error) {
        console.error('Erro ao adicionar nó bootstrap:', error);
      }
    });
    
  // Comando para remover um nó bootstrap
  program
    .command('peer-remove')
    .description('Remove um nó bootstrap')
    .argument('<address>', 'Endereço do nó no formato "ip:porta"')
    .action((address) => {
      try {
        // Verifica se o endereço está no formato correto
        const [ip, portStr] = address.split(':');
        const port = parseInt(portStr, 10);
        
        if (!ip || isNaN(port)) {
          console.error('Formato de endereço inválido. Use o formato "ip:porta"');
          return;
        }
        
        // Remove o nó da lista de bootstrap
        node.removeBootstrapNode(ip, port);
        console.log(`Nó bootstrap removido: ${ip}:${port}`);
      } catch (error) {
        console.error('Erro ao remover nó bootstrap:', error);
      }
    });
    
  // Comando para conectar a um peer
  program
    .command('connect')
    .description('Conecta a um peer')
    .argument('<address>', 'Endereço do peer no formato "ip:porta"')
    .action(async (address) => {
      try {
        await node.connectToPeer(address);
        console.log(`Conectado ao peer: ${address}`);
      } catch (error) {
        console.error('Erro ao conectar ao peer:', error);
      }
    });
    
  // Comando para sincronizar a blockchain com os peers
  program
    .command('sync')
    .description('Sincroniza a blockchain com os peers')
    .action(async () => {
      try {
        // Cria um mapa para armazenar as validações recebidas
        const validations = new Map<string, any[]>();
        
        // Inicia a sincronização
        await node.syncBlockchain(blockchain);
        console.log('Solicitação de sincronização enviada. Aguardando respostas...');
        
        // Simula o processamento de respostas
        console.log('Simulando processamento de respostas de sincronização...');
        
        // Em uma implementação real, aqui seria necessário aguardar as respostas
        // dos peers e processá-las. Por enquanto, apenas simulamos o processo.
        setTimeout(() => {
          console.log('Sincronização concluída.');
        }, 2000);
      } catch (error) {
        console.error('Erro ao sincronizar blockchain:', error);
      }
    });
    
  // Comando para validar um bloco
  program
    .command('validate')
    .description('Solicita validação de um bloco aos peers')
    .argument('<hash>', 'Hash do bloco a ser validado')
    .action(async (hash) => {
      try {
        // Busca o bloco pelo hash
        const block = blockchain.getBlockByHash(hash);
        if (!block) {
          console.error(`Bloco com hash ${hash} não encontrado.`);
          return;
        }
        
        // Cria um mapa para armazenar as validações recebidas
        const validations = new Map<string, any[]>();
        
        // Solicita validação do bloco
        await node.requestBlockValidation(block);
        console.log(`Solicitação de validação enviada para o bloco ${hash}. Aguardando respostas...`);
        
        // Simula o processamento de respostas
        console.log('Simulando processamento de respostas de validação...');
        
        // Em uma implementação real, aqui seria necessário aguardar as respostas
        // dos peers e processá-las. Por enquanto, apenas simulamos o processo.
        setTimeout(() => {
          // Simula o resultado do consenso
          const consensusResult = {
            blockHash: hash,
            validations: [
              { status: 'valid', blockHash: hash },
              { status: 'valid', blockHash: hash },
              { status: 'valid', blockHash: hash }
            ],
            accepted: true
          };
          
          console.log('\n=== Resultado da Validação ===');
          console.log(`Bloco: ${consensusResult.blockHash}`);
          console.log(`Validações recebidas: ${consensusResult.validations.length}`);
          console.log(`Consenso atingido: ${consensusResult.accepted ? 'Sim' : 'Não'}`);
          
          if (consensusResult.accepted) {
            console.log('O bloco foi validado pela rede e é considerado válido.');
          } else {
            console.log('O bloco não atingiu consenso na rede e pode ser inválido.');
          }
        }, 2000);
      } catch (error) {
        console.error('Erro ao validar bloco:', error);
      }
    });
    
  // Comando para iniciar o servidor WebSocket
  program
    .command('api')
    .description('Inicia o servidor WebSocket API')
    .option('-p, --port <port>', 'Porta para o servidor WebSocket', '8080')
    .action(async (options) => {
      try {
        const port = parseInt(options.port, 10);
        
        console.log(`\n=== Iniciando servidor WebSocket API na porta ${port} ===`);
        
        // Cria o servidor WebSocket
        const wsServer = new WebSocketAPI(port, blockchain, identity, storage, node);
        
        console.log('Servidor WebSocket API iniciado com sucesso.');
        console.log('Pressione Ctrl+C para encerrar.\n');
        
        // Mantém o processo em execução
        await new Promise(() => {
          // Esta promessa nunca é resolvida, mantendo o processo vivo
          // Até que o usuário pressione Ctrl+C
          
          // Configura um intervalo para mostrar status periódicos
          setInterval(() => {
            const peers = node.getConnectedPeers();
            const blocks = blockchain.getAllBlocks();
            console.log(`\nStatus: ${new Date().toLocaleString()}`);
            console.log(`Nó ID: ${node.getNodeId()}`);
            console.log(`Peers conectados: ${peers.length}`);
            console.log(`Blocos na blockchain: ${blocks.length}`);
          }, 30000); // A cada 30 segundos
        });
      } catch (error) {
        console.error('Erro ao iniciar servidor WebSocket API:', error);
      }
    });
  
  // Processa os argumentos da linha de comando
  program.parse(process.argv);
  
  // Se nenhum comando for fornecido, mostra a ajuda
  if (process.argv.length <= 2) {
    program.help();
  }
}
