#!/usr/bin/env bun
/**
 * Nebulus - Rede Genérica Descentralizada com Blockchain Modular
 * 
 * Desenvolvido com TypeScript + Bun para alta performance e flexibilidade
 * 
 * Este é o arquivo principal que inicia a aplicação Nebulus.
 */

import * as fs from 'fs';
import { Blockchain } from './src/core/blockchain/blockchain';
import { Identity } from './src/core/identity/identity';
import { Storage } from './src/core/storage/storage';
import { Node } from './src/core/p2p/node';
import { WebSocketAPI } from './src/core/api/websocket';
import { WalletManager } from './src/core/wallet/wallet';
import { AssetManager } from './src/core/asset/asset';
import { runCLI } from './src/cli/cli';

// Configurações padrão
const DEFAULT_INTERVAL = 5;
const DEFAULT_MAX_TRANSACTIONS = 10;
const DEFAULT_API_PORT = 8080;
const TOKEN_NAME = 'Nebula';
const TOKEN_SYMBOL = 'NEB';
const TOKEN_DECIMALS = 8;
const TOKEN_TOTAL_SUPPLY = 100000000; // 100 milhões
const TOKEN_DESCRIPTION = 'Token nativo da blockchain Nebulus';
const VALIDATOR_REWARD = 10; // 10 tokens por validação
const DEV_WALLET_LABEL = 'Desenvolvedor Nebulus';

/**
 * Função principal que inicia a aplicação
 */
async function main() {
  try {
    // Processa os argumentos da linha de comando
    const args = process.argv.slice(2);
    
    // Extrai os argumentos de configuração
    let interval = DEFAULT_INTERVAL;
    let maxTransactions = DEFAULT_MAX_TRANSACTIONS;
    let apiPort = DEFAULT_API_PORT;
    let runCliCommand = false;
    let cliArgs: string[] = [];
    
    // Processa os argumentos
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--interval' && i + 1 < args.length) {
        interval = parseInt(args[++i], 10);
      } else if (arg === '--max-tx' && i + 1 < args.length) {
        maxTransactions = parseInt(args[++i], 10);
      } else if (arg === '--port' && i + 1 < args.length) {
        apiPort = parseInt(args[++i], 10);
      } else {
        // Se não for um argumento de configuração, é um comando CLI
        runCliCommand = true;
        cliArgs = args.slice(i);
        break;
      }
    }
    
    // Se houver comandos CLI, executa a CLI
    if (runCliCommand) {
      await runCLI();
      return;
    }
    
    // Caso contrário, inicia a blockchain completa
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  ███╗   ██╗███████╗██████╗ ██╗   ██╗██╗     ██╗   ██╗███████╗ ║
║  ████╗  ██║██╔════╝██╔══██╗██║   ██║██║     ██║   ██║██╔════╝ ║
║  ██╔██╗ ██║█████╗  ██████╔╝██║   ██║██║     ██║   ██║███████╗ ║
║  ██║╚██╗██║██╔══╝  ██╔══██╗██║   ██║██║     ██║   ██║╚════██║ ║
║  ██║ ╚████║███████╗██████╔╝╚██████╔╝███████╗╚██████╔╝███████║ ║
║  ╚═╝  ╚═══╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝ ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Iniciando Blockchain Nebulus...

Configurações:
- Intervalo de geração de blocos: ${interval}ms
- Máximo de transações por bloco: ${maxTransactions}
- Porta da API WebSocket: ${apiPort}
    `);
    
    // Cria diretórios necessários
    ensureDirectoriesExist();
    
    // Inicializa a identidade
    const identity = new Identity('./data/keys');
    await identity.initialize();
    console.log('Identidade inicializada com sucesso.');
    
    // Inicializa o armazenamento
    const storage = new Storage('./data/storage');
    console.log('Armazenamento inicializado com sucesso.');
    
    // Inicializa a blockchain com os parâmetros configurados
    const blockchain = new Blockchain(
      './data/blockchain',
      2, // dificuldade padrão
      interval,
      maxTransactions
    );
    console.log('Blockchain inicializada com sucesso.');
    
    // Inicializa o nó P2P
    const node = new Node(8000);
    await node.start();
    console.log('Nó P2P inicializado com sucesso.');
    
    // Inicializa o gerenciador de carteiras
    const walletManager = new WalletManager('./data/wallets');
    walletManager.initialize();
    console.log('Gerenciador de carteiras inicializado com sucesso.');
    
    // Inicializa o gerenciador de criptoativos
    const assetManager = new AssetManager('./data/assets', identity, blockchain);
    assetManager.initialize();
    console.log('Gerenciador de criptoativos inicializado com sucesso.');
    
    // Cria a carteira do desenvolvedor se não existir
    let devWallet = findDevWallet(walletManager);
    
    if (!devWallet) {
      console.log('Criando carteira do desenvolvedor...');
      const walletWithSeed = await walletManager.createWallet(DEV_WALLET_LABEL);
      devWallet = walletManager.getWallet(walletWithSeed.address);
      console.log(`Carteira do desenvolvedor criada: ${walletWithSeed.address}`);
      console.log(`Seed phrase: ${walletWithSeed.mnemonic}`);
      console.log(`Chave privada: ${walletWithSeed.privateKey}`);
      
      // Salva as informações da carteira em um arquivo separado para referência
      saveDevWalletInfo(walletWithSeed);
    } else {
      console.log(`Carteira do desenvolvedor encontrada: ${devWallet.address}`);
    }
    
    // Verifica se a carteira do desenvolvedor foi criada com sucesso
    if (!devWallet) {
      console.error('Erro: Carteira do desenvolvedor não encontrada ou não pôde ser criada.');
      process.exit(1);
    }
    
    // Cria o token Nebula se não existir
    let nebulaToken = findNebulaToken(assetManager);
    
    if (!nebulaToken) {
      console.log('Criando token Nebula...');
      nebulaToken = await assetManager.createAsset(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        TOKEN_DECIMALS,
        TOKEN_TOTAL_SUPPLY,
        TOKEN_DESCRIPTION,
        devWallet.address
      );
      console.log(`Token Nebula criado: ${nebulaToken.id}`);
      
      // Salva as informações do token em um arquivo separado para referência
      saveNebulaTokenInfo(nebulaToken);
    } else {
      console.log(`Token Nebula encontrado: ${nebulaToken.id}`);
    }
    
    // Configura o sistema para recompensar validadores
    configureValidatorRewards(blockchain, assetManager, nebulaToken.id, devWallet.address);
    
    // Inicia a API WebSocket
    console.log(`Iniciando API WebSocket na porta ${apiPort}...`);
    const wsServer = new WebSocketAPI(apiPort, blockchain, identity, storage, node);
    console.log('API WebSocket iniciada com sucesso.');
    
    // Manipula o encerramento do processo
    process.on('SIGINT', () => {
      console.log('\nEncerrando Blockchain Nebulus...');
      blockchain.stopMining();
      wsServer.stop();
      process.exit(0);
    });
    
    console.log('\nBlockchain Nebulus iniciada com sucesso!');
    console.log('Pressione Ctrl+C para encerrar.\n');
    
    if (devWallet) {
      console.log('Carteira do Desenvolvedor:');
      console.log(`- Endereço: ${devWallet.address}`);
      console.log(`- Chave Pública: ${devWallet.publicKey.substring(0, 20)}...`);
    }
    
    if (nebulaToken) {
      console.log('\nToken Nebula:');
      console.log(`- ID: ${nebulaToken.id}`);
      console.log(`- Símbolo: ${nebulaToken.symbol}`);
      console.log(`- Oferta Total: ${nebulaToken.totalSupply}`);
    }
    
    console.log('\nPara acessar a interface web, abra o arquivo web/index.html no seu navegador.');
    
    // Configura um intervalo para mostrar status periódicos
    setInterval(() => {
      const peers = node.getConnectedPeers();
      const blocks = blockchain.getAllBlocks();
      const pendingTx = blockchain.getPendingTransactionsCount();
      console.log(`\nStatus: ${new Date().toLocaleString()}`);
      console.log(`Nó ID: ${node.getNodeId()}`);
      console.log(`Peers conectados: ${peers.length}`);
      console.log(`Blocos na blockchain: ${blocks.length}`);
      console.log(`Transações pendentes: ${pendingTx}`);
    }, 30000); // A cada 30 segundos
    
  } catch (error) {
    console.error('Erro ao iniciar Nebulus:', error);
    process.exit(1);
  }
}

// Função para garantir que os diretórios necessários existam
function ensureDirectoriesExist() {
  const directories = [
    './data',
    './data/blockchain',
    './data/keys',
    './data/storage',
    './data/wallets',
    './data/assets'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Diretório criado: ${dir}`);
    }
  });
}

// Função para encontrar a carteira do desenvolvedor
function findDevWallet(walletManager: WalletManager) {
  const wallets = walletManager.getAllWallets();
  return wallets.find(wallet => wallet.label === DEV_WALLET_LABEL);
}

// Função para encontrar o token Nebula
function findNebulaToken(assetManager: AssetManager) {
  const assets = assetManager.getAllAssets();
  return assets.find(asset => asset.symbol === TOKEN_SYMBOL && asset.name === TOKEN_NAME);
}

// Função para salvar as informações da carteira do desenvolvedor
function saveDevWalletInfo(wallet: any) {
  const info = {
    label: wallet.label,
    address: wallet.address,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic,
    createdAt: wallet.createdAt
  };
  
  fs.writeFileSync('./data/dev-wallet-info.json', JSON.stringify(info, null, 2));
  console.log('Informações da carteira do desenvolvedor salvas em ./data/dev-wallet-info.json');
}

// Função para salvar as informações do token Nebula
function saveNebulaTokenInfo(token: any) {
  fs.writeFileSync('./data/nebula-token-info.json', JSON.stringify(token, null, 2));
  console.log('Informações do token Nebula salvas em ./data/nebula-token-info.json');
}

// Função para configurar o sistema para recompensar validadores
function configureValidatorRewards(blockchain: Blockchain, assetManager: AssetManager, tokenId: string, devWalletAddress: string) {
  // Registra um listener para o evento 'block:validated'
  blockchain.on('block:validated', async (data) => {
    const { validatorAddress, blockHash } = data;
    
    if (validatorAddress && blockHash) {
      console.log(`Bloco ${blockHash} validado por ${validatorAddress}`);
      
      try {
        // Recompensa o validador com tokens Nebula
        await assetManager.transferAsset(tokenId, devWalletAddress, validatorAddress, VALIDATOR_REWARD);
        console.log(`Validador ${validatorAddress} recompensado com ${VALIDATOR_REWARD} ${TOKEN_SYMBOL}`);
      } catch (error) {
        console.error(`Erro ao recompensar validador: ${error}`);
      }
    }
  });
  
  console.log(`Sistema configurado para recompensar validadores com ${VALIDATOR_REWARD} ${TOKEN_SYMBOL} por bloco validado`);
}

// Inicia a aplicação
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
