# Sticky Notes API

Uma REST API simples para gerir notas adesivas, construída com Node.js, Express e SQLite nativo (sem dependências externas de base de dados).

## Stack

- Node.js (v22+)
- Express
- SQLite via `node:sqlite` (módulo nativo do Node.js)
- Nodemon para desenvolvimento

## Começar

```bash
git clone [https://github.com/seu-usuario/sticky-notes-api.git](https://github.com/seu-usuario/sticky-notes-api.git)
cd sticky-notes-api
npm install
npm run dev   # com hot reload
# ou
npm start
```

A API corre em `http://localhost:3000`. O ficheiro de base de dados SQLite (`database.db`) é criado automaticamente na primeira execução.

## Estrutura do projecto

```
src/
├── app.js              # Ponto de entrada
├── db/                 # Configuração da base de dados
├── routes/notes.js     # Handlers das rotas
└── middleware/error.js
insomnia/
└── sticky-notes-collection.json
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/notes` | Listar todas as notas (fixadas primeiro) |
| GET | `/notes/:id` | Obter uma nota por ID |
| POST | `/notes` | Criar uma nota |
| PATCH | `/notes/:id` | Editar título e/ou conteúdo |
| PATCH | `/notes/:id/pin` | Alternar estado de fixação |
| DELETE | `/notes/:id` | Eliminar uma nota |

## Exemplos de pedidos e respostas

**Criar uma nota**
```http
POST /notes
Content-Type: application/json
{ "title": "A minha primeira nota", "content": "Algum conteúdo aqui" }
```
```json
{
  "id": 1,
  "title": "A minha primeira nota",
  "content": "Algum conteúdo aqui",
  "pinned": 0,
  "created_at": "2026-04-14 21:00:00",
  "updated_at": "2026-04-14 21:00:00"
}
```

**Editar uma nota** — envia apenas os campos que queres alterar:
```http
PATCH /notes/1
Content-Type: application/json
{ "title": "Título actualizado" }
```

**Alternar fixação** — sem corpo no pedido, o estado inverte automaticamente:
```http
PATCH /notes/1/pin
```

**Eliminar uma nota** — devolve `204 No Content`:
```http
DELETE /notes/1
```

## Respostas de erro

Todos os erros seguem o mesmo formato:
```json
{ "error": "Mensagem aqui" }
```

- `400` — título em falta ou vazio
- `404` — nota não encontrada, ou rota desconhecida
- `500` — erro interno do servidor

## Schema da base de dados

```sql
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL DEFAULT '',
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

## Testes com Insomnia

Importa `insomnia/sticky-notes-collection.json` no Insomnia. Todos os pedidos estão pré-configurados para `http://localhost:3000`.

---

## Escalabilidade

Este projecto inclui uma segunda fase dedicada à escalabilidade horizontal, abrangendo tanto a arquitectura monolítica como a de microserviços.

### Monólito — Cluster Node.js

O monólito é escalado com o módulo nativo `cluster` do Node.js, que cria um processo worker por núcleo de CPU. Todos os workers partilham a porta `3000`; o sistema operativo distribui as conexões TCP entre eles. Se um worker falhar, o processo primário reinicia-o automaticamente.

```js
// monolith-api/cluster.js
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`worker ${worker.process.pid} saiu — a reiniciar`);
    cluster.fork();
  });
} else {
  await import('./src/app.js');
}
```

Iniciar o monólito com cluster:
```bash
node monolith-api/cluster.js
```

**Limitações conhecidas:** os workers não partilham estado em memória; escritas concorrentes no SQLite são serializadas pelo motor; toda a aplicação escala como uma unidade (notas e pins não podem ser escalados de forma independente).

### Microserviços — Réplicas e Load Balancer Round-Robin

O serviço de notas é replicado em três instâncias independentes. O API Gateway implementa um load balancer round-robin que distribui os pedidos de forma equitativa pelas réplicas.

| Ficheiro | Porta | Descrição |
|----------|-------|-----------|
| `notes-service/app.js` | 3001 | Instância principal do notes-service |
| `notes-service/appRep1.js` | 3011 | Réplica 1 |
| `notes-service/appRep2.js` | 3021 | Réplica 2 |
| `pins-service/app.js` | 3002 | Pins-service (instância única) |
| `gateway/app.js` | 3000 | API Gateway com load balancer integrado |

A lógica round-robin está em `routes/notes.js` do gateway:

```js
const NOTES_INSTANCES = [
  'http://localhost:3001',
  'http://localhost:3011',
  'http://localhost:3021',
];

let roundRobinId = 0;

function nextNotesInstance() {
  const url = NOTES_INSTANCES[roundRobinId];
  roundRobinId = (roundRobinId + 1) % NOTES_INSTANCES.length;
  return url;
}
```

Inicia todos os serviços antes do gateway:
```bash
node notes-service/app.js      # porta 3001
node notes-service/appRep1.js  # porta 3011
node notes-service/appRep2.js  # porta 3021
node pins-service/app.js       # porta 3002
node gateway/app.js            # porta 3000
```

### Testes de carga

O script de testes de carga (`monolith-api/loadTest.js`) usa a Fetch API nativa para disparar pedidos concorrentes e reportar taxa de sucesso, tempo médio de resposta e distribuição por worker.

```bash
node loadTest.js <total_pedidos> <concorrência>
# por omissão: 128 total, 32 simultâneos
node loadTest.js 128 32
```

Cada resposta inclui o cabeçalho `x-worker-pid` (monólito), permitindo confirmar que o cluster está a distribuir carga por workers distintos.

**Resultados indicativos (ambiente local):**

| Cenário | Total | OK | Erros | Tempo Médio | Observações |
|---------|-------|----|-------|-------------|-------------|
| Monólito — sem cluster (1 processo) | 100 | 100 | 0 | ~68 ms | Single event loop |
| Monólito — com cluster (50 workers) | 100 | 100 | 0 | ~57 ms | 50 PIDs distintos |
| Microserviços — 1 réplica | 100 | 100 | 0 | ~132 ms | Overhead HTTP inter-serviço |
| Microserviços — 3 réplicas + LB | 100 | 100 | 0 | ~199 ms | Round-robin confirmado nos logs |

> Os resultados variam conforme o hardware, sistema operativo e carga do sistema. Executa o script com o servidor activo para medições reais.

### Comparação de arquitecturas

| Critério | Monólito + Cluster | Microserviços |
|----------|--------------------|---------------|
| Escalabilidade | Escala toda a aplicação de uma vez via cluster | Escala cada serviço de forma independente |
| Complexidade operacional | Baixa — um único módulo a gerir | Alta — 5+ processos com dependências entre serviços |
| Latência | Baixa — sem saltos de rede entre serviços | Maior — 2+ chamadas HTTP por operação |
| Isolamento de falhas | Baixo — um bug nos pins pode afectar todo o processo | Alto — falha no pins-service não afecta o notes-service |
| Deploy independente | Não — qualquer alteração exige redeploy completo | Sim — cada serviço pode ser actualizado individualmente |
| Gestão de estado | Simples — cluster partilha a BD via sistema de ficheiros | Complexa — múltiplas BDs, consistência obrigatória |

**Conclusão:** o monólito com cluster é mais simples e tem menor latência por pedido, sendo adequado para cargas moderadas e equipas pequenas. Os microserviços tornam-se vantajosos quando os dois serviços têm padrões de tráfego muito diferentes ou precisam de ser escalados e deployados de forma independente. Em ambos os casos, o **SQLite é o principal bottleneck** em cargas de escrita intensas; uma base de dados cliente-servidor como o PostgreSQL seria necessária num ambiente distribuído real.

---

## Divisão sugerida entre devs

- Dev A — `POST /notes`, `GET /notes`, `GET /notes/:id`
- Dev B — `PATCH /notes/:id`, `PATCH /notes/:id/pin`, `DELETE /notes/:id`

## Licença

MIT
