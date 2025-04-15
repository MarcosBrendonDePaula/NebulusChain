#!/usr/bin/env bun
/**
 * Nebulus - Rede Genérica Descentralizada com Blockchain Modular
 * 
 * Desenvolvido com TypeScript + Bun para alta performance e flexibilidade
 * 
 * Este é o arquivo principal que inicia a aplicação Nebulus.
 */

import { runCLI } from './src/cli/cli';

/**
 * Função principal que inicia a aplicação
 */
async function main() {
  try {
    console.log(`
    ███╗   ██╗███████╗██████╗ ██╗   ██╗██╗     ██╗   ██╗███████╗
    ████╗  ██║██╔════╝██╔══██╗██║   ██║██║     ██║   ██║██╔════╝
    ██╔██╗ ██║█████╗  ██████╔╝██║   ██║██║     ██║   ██║███████╗
    ██║╚██╗██║██╔══╝  ██╔══██╗██║   ██║██║     ██║   ██║╚════██║
    ██║ ╚████║███████╗██████╔╝╚██████╔╝███████╗╚██████╔╝███████║
    ╚═╝  ╚═══╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝
                                                        v0.1.0
    `);
    
    // Executa a CLI
    await runCLI();
    
  } catch (error) {
    console.error('Erro ao iniciar Nebulus:', error);
    process.exit(1);
  }
}

// Inicia a aplicação
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
