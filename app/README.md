# Byte Academy 

Portal institucional simples: o aluno **vê materiais de aula** (lidos do Azure Blob Storage)
e **posta atividades** (gravadas no Azure Database for MySQL). O rodapé mostra **qual
instância** da VM Scale Set respondeu - o que prova o balanceamento de carga.

## Estrutura

```
app/
├── server.js     
├── db.js         
├── storage.js     
├── instance.js    
├── package.json
└── .env.example   
```

## Rotas

| Método | Rota | Função |
|---|---|---|
| GET | `/health` | `200 OK` puro (health probe do LB) |
| GET | `/` | Página inicial (materiais + atividades + instância) |
| POST | `/atividade` | Grava uma atividade no banco |
| GET | `/material/:name` | Baixa um arquivo do Blob (streaming, Managed Identity) |
| GET | `/db-test` | Diagnóstico de conexão com o banco (JSON) |

## Boas práticas aplicadas

- **Sem segredos no código**: credenciais vêm de variáveis de ambiente.
- **Managed Identity** para o Blob: a app não usa chave de conta de storage.
- **Queries parametrizadas**: proteção contra SQL injection.
- **Escape de HTML** na saída: proteção contra XSS no que o aluno digita.
- **TLS obrigatório** no banco (exigência do Flexible Server).
- **Resiliência**: se o banco ou o Blob caírem, a home ainda carrega com aviso, e o
  `/health` continua OK — uma falha pontual não derruba a instância no balanceador.
- **Roda como usuário sem privilégio** (`www-data`) na porta não-privilegiada `8080`.

## Variáveis de ambiente

Veja `.env.example`. Em produção (VMSS) elas são injetadas pelo `infra/cloud-init.yaml`.

| Variável | Descrição |
|---|---|
| `PORT` | Porta do app (padrão `8080`) |
| `PROJECT_NAME` | Nome exibido no topo |
| `DB_HOST` / `DB_USER` / `DB_PASS` / `DB_NAME` / `DB_PORT` | Conexão com o MySQL Flexible Server |
| `STORAGE_ACCOUNT` | Nome da Storage Account |
| `BLOB_CONTAINER` | Container dos materiais (padrão `materiais`) |

## Execução local 

```bash
cd app
cp .env.example .env    
npm install
npm start               
```
