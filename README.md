# 🌌 Nebulus

**Rede Genérica Descentralizada com Blockchain Modular**

Desenvolvido com TypeScript + Bun para alta performance e flexibilidade

## 📛 Nome do Projeto: Nebulus

**Inspiração:**
"Nebulus" vem de nebulosa, representando uma formação descentralizada, expansiva e interligada. O nome transmite perfeitamente a essência da rede: distribuição, liberdade, flexibilidade e interconexão.

## 🎯 Propósito

Nebulus é uma infraestrutura modular e descentralizada baseada em blockchain, capaz de registrar, verificar, criptografar e distribuir qualquer tipo de informação entre múltiplos nós com segurança e controle de acesso.

## 💡 Por que Nebulus existe?

- ✊ Eliminar dependência de servidores centrais
- 🔒 Garantir autenticidade e privacidade por padrão
- 🧠 Ser genérico: capaz de registrar qualquer tipo de dado
- 🧱 Servir como base para aplicações descentralizadas (via SDK futuro)
- ⚖️ Oferecer controle total sobre quem pode ler, validar e assinar os dados

## 🧱 Principais Recursos

| Recurso | Descrição |
|---------|-----------|
| 🔗 Blockchain Genérica | Blocos com dados estruturados, assinaturas múltiplas e criptografia opcional |
| 🔐 Identidade Criptográfica | Cada nó possui chave pública/privada (RSA) para assinar e verificar dados |
| 🔁 Multisig | Suporte a múltiplas assinaturas por registro |
| 🛡️ Criptografia AES | Payloads são criptografados com AES-256-CBC e protegidos por token |
| 📂 Armazenamento Local | Arquivos ou blobs salvos por hash localmente |
| 🌐 Rede P2P | Comunicação entre nós com Libp2p e discovery via bootstrap |
| ⚙️ Executado com Bun | Alta performance, suporte nativo a TS e empacotamento embutido |

## 📦 Tipos de Registros Suportados

```ts
type RecordType = "file" | "transaction" | "event" | "identity" | "custom";
```

O campo `data.type` define o propósito do registro, e `data.payload` é genérico, podendo armazenar qualquer estrutura, inclusive criptografada.

## 🔐 Assinaturas Digitais

- Cada dado é assinado digitalmente com a chave privada do autor.
- Outros nós podem verificar a assinatura com a chave pública correspondente.
- As assinaturas são armazenadas no bloco:

```ts
interface Signature {
  publicKey: string;
  signature: string;
}
```

## 🔄 Multisig (Assinaturas Múltiplas)

Cada bloco pode exigir mais de uma assinatura para ser considerado válido:

```ts
{
  signatures: Signature[];
  requiredSigners: number;
}
```

O sistema valida se o número de assinaturas válidas ≥ requiredSigners.

Ideal para contratos, coautorias, curadoria descentralizada etc.

## 🔒 Criptografia de Payloads

- Cada payload pode ser criptografado com AES-256-CBC.
- Um token (chave secreta) é gerado no momento da criação.
- Apenas quem tem o token consegue decriptar o conteúdo.
- O IV (vetor de inicialização) é salvo no bloco.

```ts
interface EncryptedData {
  encryptedPayload: string;
  iv: string;
}
```

## 🧩 Estrutura de Bloco

```ts
interface Block {
  timestamp: number;
  data: {
    type: string;
    payload: string | object;
    encryption?: {
      method: "AES-256-CBC";
      iv: string;
      encrypted: boolean;
    };
    signatures: Signature[];
    requiredSigners: number;
  };
  previousHash: string;
  hash: string;
  nonce: number;
}
```

## 🚀 Instalação

1. Certifique-se de ter o [Bun](https://bun.sh/) instalado (versão ≥ 1.0)
2. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/nebulus.git
   cd nebulus
   ```
3. Instale as dependências:
   ```
   bun install
   ```

## 🔨 Compilação

Você pode compilar o projeto e gerar executáveis para teste:

1. Compilar para JavaScript:
   ```
   bun run build
   ```
   Isso gerará os arquivos JavaScript na pasta `dist/`.

2. Gerar um executável:
   ```
   bun run compile
   ```
   Isso criará um arquivo executável `nebulus.exe` que pode ser executado diretamente.

## 🧪 Comandos da CLI

### Usando Bun diretamente:

| Comando | Função |
|---------|--------|
| `bun index.ts add <arquivo>` | Adiciona arquivo criptografado (opcional) à blockchain |
| `bun index.ts sign <arquivo.json>` | Assina e adiciona dados de um arquivo JSON à blockchain |
| `bun index.ts tx <arquivo.json>` | Alias para o comando sign |
| `bun index.ts blocks` | Lista todos os blocos armazenados |
| `bun index.ts keys` | Mostra a chave pública local |
| `bun index.ts decrypt <token>` | Descriptografa um payload com o token fornecido |
| `bun index.ts serve` | Mantém o nó em execução e escutando por conexões |
| `bun index.ts peers` | Lista os nós bootstrap e peers conectados |
| `bun index.ts peer-add <ip:porta>` | Adiciona um nó bootstrap |
| `bun index.ts peer-remove <ip:porta>` | Remove um nó bootstrap |
| `bun index.ts connect <ip:porta>` | Conecta a um peer específico |
| `bun index.ts sync` | Sincroniza a blockchain com os peers |
| `bun index.ts validate <hash>` | Solicita validação de um bloco aos peers |
| `bun index.ts api` | Inicia o servidor WebSocket API |

### Usando o executável compilado:

| Comando | Função |
|---------|--------|
| `.\nebulus.exe add <arquivo>` | Adiciona arquivo criptografado (opcional) à blockchain |
| `.\nebulus.exe sign <arquivo.json>` | Assina e adiciona dados de um arquivo JSON à blockchain |
| `.\nebulus.exe tx <arquivo.json>` | Alias para o comando sign |
| `.\nebulus.exe blocks` | Lista todos os blocos armazenados |
| `.\nebulus.exe keys` | Mostra a chave pública local |
| `.\nebulus.exe decrypt <token>` | Descriptografa um payload com o token fornecido |
| `.\nebulus.exe serve` | Mantém o nó em execução e escutando por conexões |
| `.\nebulus.exe peers` | Lista os nós bootstrap e peers conectados |
| `.\nebulus.exe peer-add <ip:porta>` | Adiciona um nó bootstrap |
| `.\nebulus.exe peer-remove <ip:porta>` | Remove um nó bootstrap |
| `.\nebulus.exe connect <ip:porta>` | Conecta a um peer específico |
| `.\nebulus.exe sync` | Sincroniza a blockchain com os peers |
| `.\nebulus.exe validate <hash>` | Solicita validação de um bloco aos peers |
| `.\nebulus.exe api` | Inicia o servidor WebSocket API |

## 🔄 Mantendo a Blockchain Aberta

Para manter a blockchain aberta e escutando por conexões de outros nós, use o comando `serve`:

```bash
bun index.ts serve
```

Isso manterá o nó em execução até que você pressione Ctrl+C para encerrá-lo. O nó exibirá atualizações de status a cada 30 segundos, mostrando:

- Data e hora atual
- ID do nó
- Número de peers conectados
- Número de blocos na blockchain

Você também pode especificar uma porta personalizada:

```bash
bun index.ts serve --port 9000
```

## 🌐 Gerenciamento de Nós Bootstrap

O Nebulus utiliza um sistema de nós bootstrap para descoberta inicial de peers na rede. Por padrão, o sistema tenta obter uma lista de nós bootstrap de um servidor web e, caso falhe, utiliza uma lista de cache local. Se a lista de cache estiver vazia, o sistema usa o nó de teste padrão (192.168.1.22:42422).

### Conexões P2P

O Nebulus implementa as seguintes regras para conexões P2P:

1. **Múltiplas Conexões**: Um nó pode se conectar a vários outros nós simultaneamente, permitindo uma rede robusta e resiliente.
2. **Prevenção de Auto-conexão**: Um nó não pode se conectar a si mesmo. O sistema verifica automaticamente se o endereço de destino corresponde ao próprio nó e impede essa conexão.
3. **Conexões Duplicadas**: O sistema evita conexões duplicadas, verificando se já existe uma conexão com o peer antes de tentar estabelecer uma nova.
4. **Tolerância a Falhas**: Se a conexão com um nó falhar, o sistema continua tentando se conectar aos outros nós disponíveis.

### Listando Nós Bootstrap

Para listar os nós bootstrap configurados e os peers conectados:

```bash
bun index.ts peers
```

### Adicionando um Nó Bootstrap

Para adicionar um nó bootstrap à lista:

```bash
bun index.ts peer-add 192.168.1.100:42422
```

### Removendo um Nó Bootstrap

Para remover um nó bootstrap da lista:

```bash
bun index.ts peer-remove 192.168.1.100:42422
```

### Conectando a um Peer

Para conectar manualmente a um peer específico:

```bash
bun index.ts connect 192.168.1.100:42422
```

Os nós adicionados são salvos automaticamente em um arquivo de cache local (`./data/bootstrap-cache.json`) e serão carregados nas próximas execuções do sistema.

## 🌐 Interface Web e API WebSocket

O Nebulus oferece uma interface web e uma API WebSocket para interação com a blockchain a partir de aplicações web ou outros sistemas.

### Interface Web

Para acessar a interface web, primeiro inicie o servidor WebSocket API:

```bash
bun index.ts api
```

Em seguida, abra o arquivo `web/index.html` em seu navegador. A interface web permite:

- Visualizar blocos na blockchain
- Criar e enviar transações
- Enviar arquivos para a blockchain
- Gerar e gerenciar chaves criptográficas

A interface web se conecta automaticamente ao servidor WebSocket API na porta 8080.

### API WebSocket

### Iniciando o Servidor WebSocket

Para iniciar o servidor WebSocket API:

```bash
bun index.ts api
```

Por padrão, o servidor escuta na porta 8080. Você pode especificar uma porta diferente:

```bash
bun index.ts api --port 9090
```

### Mensagens WebSocket

A comunicação com a API é feita através de mensagens JSON com a seguinte estrutura:

```json
{
  "type": "tipo_da_mensagem",
  "data": { ... },
  "requestId": "id_opcional_para_correlacionar_respostas"
}
```

### Tipos de Mensagens Suportadas

#### Consultas
- `get_blocks`: Obtém todos os blocos da blockchain
- `get_block`: Obtém um bloco específico pelo hash
- `get_peers`: Lista os peers conectados e nós bootstrap
- `get_node_info`: Obtém informações sobre o nó atual

#### Ações
- `add_transaction`: Adiciona uma nova transação à blockchain
- `add_file`: Adiciona um arquivo à blockchain (conteúdo em base64)
- `decrypt_payload`: Descriptografa um payload com o token fornecido
- `connect_peer`: Conecta a um peer específico
- `sync_blockchain`: Sincroniza a blockchain com os peers
- `validate_block`: Solicita validação de um bloco específico

#### Eventos
A API também emite eventos para os clientes conectados:
- `new_block_event`: Quando um novo bloco é adicionado
- `peer_connected_event`: Quando um peer se conecta
- `peer_disconnected_event`: Quando um peer se desconecta
- `sync_completed_event`: Quando a sincronização é concluída
- `validation_result_event`: Quando o resultado da validação está disponível

### Exemplo de Uso (JavaScript)

```javascript
// Conectar ao servidor WebSocket
const ws = new WebSocket('ws://localhost:8080');

// Enviar uma solicitação para obter todos os blocos
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'get_blocks',
    requestId: '123'
  }));
};

// Receber a resposta
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('Blocos recebidos:', response.data.blocks);
};
```

## 🔄 Sincronização e Validação de Blocos

O Nebulus implementa um sistema de sincronização e validação de blocos entre os nós da rede, garantindo a integridade e consistência da blockchain.

### Sincronização de Blocos

Para sincronizar sua blockchain local com os peers conectados:

```bash
bun index.ts sync
```

Este comando solicita aos peers conectados os blocos que você não possui. Cada bloco recebido passa por um processo de validação antes de ser adicionado à blockchain local.

### Validação de Blocos

Para solicitar a validação de um bloco específico pelos peers:

```bash
bun index.ts validate <hash>
```

Este comando envia o bloco para todos os peers conectados, que validam o bloco e retornam o resultado. O sistema então verifica se há consenso entre os peers (pelo menos 67% de validações positivas) para determinar se o bloco é válido.

### Processo de Validação

Cada bloco passa por várias verificações durante o processo de validação:

1. **Verificação de Hash**: O hash do bloco deve corresponder ao seu conteúdo
2. **Verificação de Cadeia**: O bloco deve apontar para um bloco anterior válido
3. **Verificação de Assinaturas**: O bloco deve ter o número mínimo de assinaturas válidas
4. **Verificação de Conteúdo**: O conteúdo do bloco deve estar em conformidade com o tipo de registro

Apenas blocos que passam por todas essas verificações são adicionados à blockchain local.

## 🧠 Fluxo de Funcionamento

1. Nó é iniciado (gera par de chaves se não houver).
2. Conecta-se a peers conhecidos via Libp2p.
3. Usuário registra um dado (arquivo, evento, etc.).
4. O conteúdo pode ser criptografado com AES.
5. A assinatura digital é gerada e anexada.
6. O bloco é criado e adicionado localmente.
7. Futuramente: blocos são sincronizados entre nós.

## 🧰 Requisitos da Rede Nebulus

| Item | Requisito |
|------|-----------|
| Plataforma mínima | Bun ≥ v1.0 |
| Porta aberta | TCP (libp2p) |
| Persistência | Disco local (JSON, futura LevelDB) |
| Criptografia | Suporte a RSA e AES (nativo) |
| Segurança | Chave privada nunca deixa o nó |

## 🔮 Roadmap Futuro

| Fase | Tarefas |
|------|---------|
| 📦 MVP | Blockchain, Criptografia, Assinatura, Multisig, CLI |
| 🌐 P2P+ | Validação entre nós, broadcast de blocos |
| 📚 SDK | Facilitar criação de apps sobre Nebulus |
| 🌍 Web Interface | Interface leve para interação |
| 🔑 Proxy Re-Encryption | Compartilhamento seletivo e temporário de chaves |
| 🧠 AI Logs | Validação de integridade e análise de inconsistências |

## 📝 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
