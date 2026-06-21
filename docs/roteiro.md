# Projeto 1 — Aplicação Web Resiliente com Escalabilidade Automática (Microsoft Azure)

> Roteiro **CLI-first**: tudo o que é possível é feito via **Azure CLI (`az`)**, que roda
> igual no **PowerShell** e no **Git Bash**. Foco em **menor custo**, **boas práticas**,
> **evidências (prints)** e **publicação no GitHub** (portfólio).

---

## 0. Como usar este roteiro

- Os comandos `az` são **idênticos** em PowerShell e Git Bash. Só muda a forma de declarar
  variáveis (bloco da Seção 3) e a **continuação de linha**. Por isso, **cada comando `az`
  está em UMA linha só** — basta copiar e colar inteiro.
- **📸 PRINT #N** = momento obrigatório de captura. Em CLI, o print é do **terminal (comando +
  saída)**; quando for navegador, está indicado.
- **💰 CUSTO** = decisão para reduzir gasto. **✅ BOA PRÁTICA** = ponto que valoriza o portfólio.
- **⚠️** = cuidado para não quebrar o ambiente nem vazar segredo.

---

## 1. Visão geral da arquitetura

```
                          Internet
                             │
                             ▼
                  ┌──────────────────────┐
                  │  IP Público (Standard)│
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Load Balancer        │  ← health probe HTTP /health :8080
                  │  (Standard, público)  │     regra: 80 → 8080 · outbound rule
                  └──────────┬───────────┘
                             ▼
        ┌──────────────── VNet 10.10.0.0/16 ─────────────────┐
        │   subnet-web 10.10.1.0/24 (nsg-web)                 │
        │   ┌───────────────────────────────────────┐         │
        │   │  VM Scale Set (autoscale 2→3)          │         │
        │   │  Standard_B1s · Ubuntu · Node.js app   │         │
        │   │  [vm0] [vm1] ... (escala por CPU)      │         │
        │   └───────────────┬───────────────────────┘         │
        │                   │ (rede interna)                   │
        │   subnet-db 10.10.2.0/24 (delegada, nsg-db)          │
        │   ┌───────────────▼───────────────────────┐         │
        │   │  Azure Database for MySQL              │         │
        │   │  Flexible Server (Burstable B1ms)      │         │
        │   │  Acesso privado (sem IP público)       │         │
        │   └───────────────────────────────────────┘         │
        └─────────────────────────────────────────────────────┘
                   │
                   ▼ (a app lê 1 arquivo estático via Managed Identity)
        ┌──────────────────────────────┐
        │  Storage Account / Blob       │  ← imagem/logo do site
        │  (Standard LRS)               │
        └──────────────────────────────┘
```

**Serviços (9 — o projeto exige no mínimo 5):** Virtual Network · Subnets pública e privada ·
VM Scale Set · Standard Load Balancer · Azure Database for MySQL Flexible Server · Blob Storage ·
Network Security Groups · Azure Monitor (autoscale) · Managed Identity.

---

## 2. Decisões de custo (💰) e de arquitetura (✅) — base da "justificativa"

| Item | Escolha | Justificativa |
|---|---|---|
| 💰 Conta | **Azure free account** | US$ 200 (30 dias) + 12 meses de serviços gratuitos. |
| 💰 Região | **East US 2** (alt.: *Brazil South*) | East US 2 costuma ser a mais barata; Brazil South reduz latência no BR a um custo maior — premissa documentada no relatório. |
| 💰 Camada web | **VM Scale Set** com **Standard_B1s** | VMSS dá auto scaling nativo; B1s (burstable) é o menor que roda Node bem. |
| 💰 Banco | **MySQL Flexible Server — Burstable B1ms** | Tier mais barato; **750 h/mês grátis por 12 meses** na free account. Escolhi **MySQL** (entre MySQL/PostgreSQL permitidos) por simplicidade do driver Node. |
| 💰 Balanceador | **Azure Load Balancer (Standard)** | Entre LB/Application Gateway permitidos, o LB (L4) é **mais barato**; Application Gateway (L7) só se valeria por WAF/roteamento por URL, fora do escopo. |
| 💰 Storage | **Standard LRS** | Redundância local é a mais barata; basta para 1 arquivo estático. |
| 💰 HA do banco | **Desabilitada** | HA zonal dobra o compute; desnecessário aqui. |
| 💰 Instâncias | autoscale **mín. 2 / máx. 3** | 2 é o mínimo para demonstrar balanceamento e "qual instância respondeu". |
| 💰 Saída de internet | **Outbound rule no Load Balancer** | Evita NAT Gateway (que custa à parte); o Standard LB bloqueia saída por padrão. |
| 💰 Ciclo de vida | **Stop/Deallocate** no uso + **deletar o RG no fim** | O maior risco de custo é deixar recurso ligado (Seção 13). |
| ✅ Banco privado | **Private access (VNet)**, sem IP público | Requisito "banco não exposto à internet". |
| ✅ Segredos | **Sem senha/connection string no código** | Variáveis de ambiente via cloud-init; nada commitado. |
| ✅ Storage | **Managed Identity** lê o blob | Sem chave de conta no código da app. |
| ✅ Acesso às VMs | **Sem IP público nas instâncias**; admin por `az vmss run-command` | Requisito "não acessar pelo IP público das instâncias". |

> ⚠️ **Standard Load Balancer é "secure by default"**: bloqueia entrada/saída por padrão.
> Resolvemos com **NSG** (entrada) + **outbound rule** no LB (saída barata, sem NAT Gateway).

---

## 3. Pré-requisitos e setup de variáveis

Instale o **Azure CLI**: `https://learn.microsoft.com/cli/azure/install-azure-cli`
Depois autentique:

```
az login
az account show -o table
```

Se tiver mais de uma assinatura: `az account set --subscription "NOME_OU_ID"`.

**Declare as variáveis no seu shell** (os comandos `az` seguintes usam `$RG`, `$LOC` etc.):

**PowerShell**
```
$RG="rg-projeto1-webapp"; $LOC="eastus2"; $VNET="vnet-projeto1"; $ST="stprojeto1seunome"; $MYSQL="mysql-projeto1-seunome"; $DBPASS="TroqueEstaSenha!123"
```

**Git Bash / Linux / macOS**
```
RG="rg-projeto1-webapp"; LOC="eastus2"; VNET="vnet-projeto1"; ST="stprojeto1seunome"; MYSQL="mysql-projeto1-seunome"; DBPASS="TroqueEstaSenha!123"
```

> ⚠️ `$ST` (storage) deve ser **único no mundo**, **3–24 chars**, só **minúsculas/números**.
> ⚠️ `$DBPASS` é só para o terminal — **não comite** e **não deixe aparecer em prints**.

---

## 4. Convenção de nomes (✅ rastreável)

| Recurso | Nome |
|---|---|
| Resource Group | `rg-projeto1-webapp` |
| VNet | `vnet-projeto1` (`10.10.0.0/16`) |
| Subnet web | `subnet-web` (`10.10.1.0/24`) · Subnet db | `subnet-db` (`10.10.2.0/24`) |
| NSGs | `nsg-web`, `nsg-db` |
| Storage / container | `stprojeto1<seunome>` / `materiais` |
| MySQL | `mysql-projeto1-<seunome>` · database `appdb` |
| VMSS | `vmss-web` · LB `lb-projeto1` · IP `pip-lb-projeto1` · backend pool `bepool` |
| Autoscale | `autoscale-vmss` |

---

## 5. Provisionamento via CLI

### 5.1. Resource Group
```
az group create --name $RG --location $LOC
```
> 📸 **PRINT #1** — saída do comando (mostra `provisioningState: Succeeded`, nome e região).

### 5.2. VNet + sub-redes
```
az network vnet create --resource-group $RG --name $VNET --address-prefix 10.10.0.0/16 --subnet-name subnet-web --subnet-prefix 10.10.1.0/24
```
```
az network vnet subnet create --resource-group $RG --vnet-name $VNET --name subnet-db --address-prefix 10.10.2.0/24
```
```
az network vnet subnet list --resource-group $RG --vnet-name $VNET -o table
```
> ✅ Sub-rede pública e privada separadas. 📸 **PRINT #2** — a tabela com as duas sub-redes.

### 5.3. NSGs e regras
```
az network nsg create --resource-group $RG --name nsg-web
az network nsg create --resource-group $RG --name nsg-db
```
Descubra seu IP público e guarde em variável:
- PowerShell: `$MYIP=(Invoke-RestMethod ifconfig.me)`
- Git Bash: `MYIP=$(curl -s ifconfig.me)`

Regras do `nsg-web` (entrada):
```
az network nsg rule create --resource-group $RG --nsg-name nsg-web --name allow-http --priority 100 --protocol Tcp --destination-port-ranges 80 --access Allow --direction Inbound --source-address-prefixes Internet
```
```
az network nsg rule create --resource-group $RG --nsg-name nsg-web --name allow-probe --priority 110 --protocol Tcp --destination-port-ranges 8080 --access Allow --direction Inbound --source-address-prefixes AzureLoadBalancer
```
```
az network nsg rule create --resource-group $RG --nsg-name nsg-web --name allow-ssh-meu-ip --priority 120 --protocol Tcp --destination-port-ranges 22 --access Allow --direction Inbound --source-address-prefixes $MYIP
```
Regra do `nsg-db` (só MySQL vindo da subnet web):
```
az network nsg rule create --resource-group $RG --nsg-name nsg-db --name allow-mysql-from-web --priority 100 --protocol Tcp --destination-port-ranges 3306 --access Allow --direction Inbound --source-address-prefixes 10.10.1.0/24
```
Associe os NSGs às sub-redes:
```
az network vnet subnet update --resource-group $RG --vnet-name $VNET --name subnet-web --network-security-group nsg-web
```
```
az network vnet subnet update --resource-group $RG --vnet-name $VNET --name subnet-db --network-security-group nsg-db
```
```
az network nsg rule list --resource-group $RG --nsg-name nsg-web -o table
az network nsg rule list --resource-group $RG --nsg-name nsg-db -o table
```
> ✅ SSH só para o seu IP; banco só recebe 3306 da subnet web.
> 📸 **PRINT #3** — regras do `nsg-web`. 📸 **PRINT #4** — regras do `nsg-db`.

### 5.4. Storage Account + container `materiais` + upload dos arquivos de aula
> A app **lista os arquivos deste container** e os exibe na seção "Materiais de aula".
> O nome do container precisa bater com `BLOB_CONTAINER` do app (padrão: `materiais`).
```
az storage account create --resource-group $RG --name $ST --location $LOC --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false
```
Pegue a chave **apenas para o upload local** (a app NÃO usará chave; usará Managed Identity):
- PowerShell: `$KEY=(az storage account keys list -g $RG -n $ST --query "[0].value" -o tsv)`
- Git Bash: `KEY=$(az storage account keys list -g $RG -n $ST --query "[0].value" -o tsv)`
```
az storage container create --account-name $ST --account-key $KEY --name materiais --public-access off
```
Coloque na pasta atual alguns arquivos de aula (ex.: `aula01.pdf`, `slides-redes.pdf`,
`exercicios.pdf`) e suba — pode ser um por vez:
```
az storage blob upload --account-name $ST --account-key $KEY --container-name materiais --name aula01.pdf --file ./aula01.pdf
az storage blob upload --account-name $ST --account-key $KEY --container-name materiais --name slides-redes.pdf --file ./slides-redes.pdf
```
…ou todos de uma vez (todos os arquivos da pasta atual):
```
az storage blob upload-batch --account-name $ST --account-key $KEY --destination materiais --source .
```
Confira o que subiu:
```
az storage blob list --account-name $ST --account-key $KEY --container-name materiais -o table
```
> ✅ Container **privado**; acesso só pela Managed Identity da VMSS. ⚠️ Não comite `$KEY`.
> 💡 Se não tiver PDFs à mão, qualquer arquivo serve para a demonstração (txt, png, etc.).
> 📸 **PRINT #5** — saída do `storage account create`. 📸 **PRINT #6** — `blob list` mostrando os materiais no container `materiais`.

### 5.5. MySQL Flexible Server (privado, Burstable B1ms)
```
az mysql flexible-server create --resource-group $RG --name $MYSQL --location $LOC --admin-user dbadmin --admin-password "$DBPASS" --sku-name Standard_B1ms --tier Burstable --storage-size 20 --version 8.0.21 --vnet $VNET --subnet subnet-db --private-dns-zone projeto1.private.mysql.database.azure.com --high-availability Disabled --yes
```
```
az mysql flexible-server db create --resource-group $RG --server-name $MYSQL --database-name appdb
az mysql flexible-server show --resource-group $RG --name $MYSQL -o table
```
> ✅ `--vnet/--subnet` cria acesso **privado** (sem IP público) e delega a `subnet-db`.
> ⚠️ Anote o **FQDN** (saída do `show`, campo `fullyQualifiedDomainName`) — vai para a app.
> 📸 **PRINT #7** — `show` do servidor mostrando tier Burstable e ausência de endpoint público.

### 5.6. Load Balancer (Standard) ANTES da VMSS
> Criamos o LB primeiro para que a **saída de internet** já exista quando as VMs subirem
> (senão o `apt`/blob do cloud-init falha).
```
az network public-ip create --resource-group $RG --name pip-lb-projeto1 --sku Standard --allocation-method Static
```
```
az network lb create --resource-group $RG --name lb-projeto1 --sku Standard --public-ip-address pip-lb-projeto1 --frontend-ip-name feip --backend-pool-name bepool
```
```
az network lb probe create --resource-group $RG --lb-name lb-projeto1 --name probe-8080 --protocol Http --port 8080 --path /health
```
```
az network lb rule create --resource-group $RG --lb-name lb-projeto1 --name rule-http --protocol Tcp --frontend-port 80 --backend-port 8080 --frontend-ip-name feip --backend-pool-name bepool --probe-name probe-8080 --disable-outbound-snat true
```
```
az network lb outbound-rule create --resource-group $RG --lb-name lb-projeto1 --name outrule --frontend-ip-configs feip --protocol All --address-pool bepool
```
> 📸 **PRINT #8** — `az network lb probe list -g $RG --lb-name lb-projeto1 -o table` (probe 8080/health).
> 📸 **PRINT #9** — `az network lb rule list -g $RG --lb-name lb-projeto1 -o table` (80→8080).

### 5.7. VM Scale Set (camada web) + Managed Identity
> ⚠️ Este passo usa `cloud-init.yaml` — gerado na **fase do app (Seção 16)**. Rode-o **depois**
> de termos o app/cloud-init prontos. Se quiser validar a infra antes, use um cloud-init mínimo.
```
az vmss create --resource-group $RG --name vmss-web --image Ubuntu2204 --vm-sku Standard_B1s --instance-count 2 --vnet-name $VNET --subnet subnet-web --lb lb-projeto1 --backend-pool-name bepool --admin-username azureuser --generate-ssh-keys --assign-identity --custom-data cloud-init.yaml --upgrade-policy-mode Automatic
```
```
az vmss list-instances --resource-group $RG --name vmss-web -o table
az vmss identity show --resource-group $RG --name vmss-web -o table
```
Conceda à identidade da VMSS leitura no blob (✅ sem chave no código):
- PowerShell: `$PRIN=(az vmss identity show -g $RG -n vmss-web --query principalId -o tsv); $STID=(az storage account show -g $RG -n $ST --query id -o tsv)`
- Git Bash: `PRIN=$(az vmss identity show -g $RG -n vmss-web --query principalId -o tsv); STID=$(az storage account show -g $RG -n $ST --query id -o tsv)`
```
az role assignment create --assignee $PRIN --role "Storage Blob Data Reader" --scope $STID
```
> 📸 **PRINT #10** — `vmss list-instances` (2 instâncias). 📸 **PRINT #11** — `role assignment` criado.
> 📸 **PRINT #12** — `az network lb address-pool show -g $RG --lb-name lb-projeto1 -n bepool -o json` mostrando as NICs/instâncias registradas no backend pool.

### 5.8. Auto Scaling (Azure Monitor)
```
az monitor autoscale create --resource-group $RG --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets --name autoscale-vmss --min-count 2 --max-count 3 --count 2
```
```
az monitor autoscale rule create --resource-group $RG --autoscale-name autoscale-vmss --condition "Percentage CPU > 70 avg 5m" --scale out 1
```
```
az monitor autoscale rule create --resource-group $RG --autoscale-name autoscale-vmss --condition "Percentage CPU < 30 avg 5m" --scale in 1
```
```
az monitor autoscale show --resource-group $RG --name autoscale-vmss -o table
```
> 📸 **PRINT #13** — autoscale criado com min/max e as regras de CPU.

---

## 6. Validação e evidências (terminal + navegador)

Pegue o IP público do LB:
- PowerShell: `$LBIP=(az network public-ip show -g $RG -n pip-lb-projeto1 --query ipAddress -o tsv); $LBIP`
- Git Bash: `LBIP=$(az network public-ip show -g $RG -n pip-lb-projeto1 --query ipAddress -o tsv); echo $LBIP`

```
curl http://$LBIP
curl http://$LBIP
curl http://$LBIP/db-test
```
Abra no navegador `http://<LBIP>` e atualize várias vezes (Ctrl+F5) — o **hostname alterna**.

> 📸 **PRINT #14** — navegador no `http://<LBIP>` com nome do projeto + **instância que respondeu** + a **lista de materiais** vinda do Blob.
> 📸 **PRINT #15** — recarga mostrando **outro hostname** (prova do balanceamento).
> 📸 **PRINT #16** — `curl .../db-test` ou navegador mostrando conexão OK + **contagem de registros**.
> 📸 **PRINT #17** — formulário do site → **atividade gravada e listada** (lida do MySQL).
> 📸 **PRINT #6a** — clicar em **"Abrir"** num material e o arquivo carregando (download via `/material/:name`). *(Reforça "object storage utilizado".)*

---

## 7. Teste de escala (sem SSH, via run-command)
```
az vmss run-command invoke --resource-group $RG --name vmss-web --command-id RunShellScript --instance-id 0 --scripts "sudo apt-get update && sudo apt-get install -y stress-ng && stress-ng --cpu 2 --timeout 300s"
```
Acompanhe em outro terminal:
```
az vmss list-instances --resource-group $RG --name vmss-web -o table
```
> 📸 **PRINT #18** — `list-instances` mostrando **3 instâncias** durante a carga (scale-out).
> 📸 **PRINT #19** — após cessar a carga, retorno a **2 instâncias** (scale-in). *(reforço, opcional)*

---

## 8. Relatório de custo (Azure Pricing Calculator)

Na **Pricing Calculator** (`azure.microsoft.com/pricing/calculator`), monte com as **mesmas
premissas** do deploy e inclua **todos** estes itens (exigência do enunciado):
- **VMs (VMSS):** 2× `B1s`, Linux, região, horas/mês estimadas;
- **Banco gerenciado:** MySQL Flexible Server Burstable `B1ms`, 20 GB;
- **Load Balancer:** Standard + regras + dados processados;
- **Object storage (Blob):** Standard LRS, poucos GB;
- **Armazenamento em disco:** discos de SO das VMs (managed disk de cada instância); ⚠️ *não esquecer este item*;
- **Transferência de dados (bandwidth):** estimativa de saída.

Documente as **premissas**: região, tamanho das VMs, mín/máx de instâncias, tipo de banco e
volume de storage. Deixe claro que o custo real tende a ~0 com **free tier + desligar/deletar**.

> 📸 **PRINT #20** — resumo da Pricing Calculator com o **total mensal estimado**.

---

## 9. Diagrama (draw.io)

Reproduza a Seção 1 no **draw.io** (`app.diagrams.net`) incluindo: usuário/Internet → IP público
→ Load Balancer → VMSS (subnet pública) → MySQL (subnet privada), o Blob Storage, **os NSGs** e a
**região**. Exporte **PNG** + **.drawio** (editável é um diferencial).

> 📸 **PRINT #21** — diagrama finalizado (ou inclua o PNG no repositório).

---

## 10. Relatório técnico — conteúdo obrigatório (exigência do enunciado)

Crie `docs/relatorio-tecnico.md` contendo **exatamente** estes tópicos:
1. **Provedor escolhido** — Microsoft Azure (e por quê).
2. **Região utilizada** — ex.: East US 2 (premissa de custo) — ou Brazil South (latência).
3. **Serviços provisionados** — lista da Seção 1 (os 9).
4. **Justificativa da arquitetura** — use a tabela da Seção 2 (LB vs App Gateway, MySQL vs
   PostgreSQL, B1s/B1ms, banco privado, Managed Identity, outbound rule sem NAT Gateway).
5. **Evidências de funcionamento** — prints #14, #16, #17.
6. **Evidências de balanceamento** — prints #12, #14, #15.
7. **Evidências de auto scaling** — prints #13, #18, #19.
8. **Principais dificuldades** — ex.: Standard LB secure-by-default e a necessidade de outbound;
   delegação da subnet ao MySQL; ordem LB→VMSS para o cloud-init ter saída.
9. **Procedimento de limpeza** — Seção 13 (comando + print #22).

---

## 11. Mapa de prints × exigências do professor

| Evidência exigida | Print(s) |
|---|---|
| Aplicação acessível pelo Load Balancer | #14 |
| Instâncias registradas no balanceador | #12 |
| Banco de dados criado | #7 |
| Banco de dados utilizado | #16, #17 |
| Object storage criado | #5, #6 |
| Object storage utilizado | #6, #14 (materiais listados) e #6a (download de um material) |
| Auto scaling configurado | #13 |
| Teste de escala / carga | #18 (#19 opcional) |
| Qual instância respondeu | #14, #15 |
| Diagrama de arquitetura | #21 |
| Relatório de custo | #20 |
| Recursos removidos | #22 |
| Organização / nomes / região | #1, #2 |

> Salve numerado em `/evidencias` (ex.: `print-14-app-no-lb.png`).

---

## 12. ⚠️ Segurança em prints e no repositório

Antes de printar/commitar, garanta que **não** aparecem: senhas, connection strings, chaves de
storage, chave SSH privada, SAS completos. Pode **borrar** o `subscription id`.
No repo: **nunca** comite `.env`, chaves ou cloud-init com segredo real — use `.env.example`
e injete segredos só em runtime.

---

## 13. Limpeza dos recursos (💰 e obrigatório)

**Durante o desenvolvimento (economia sem destruir):**
```
az vmss deallocate --resource-group $RG --name vmss-web
az mysql flexible-server stop --resource-group $RG --name $MYSQL
```
**No fim do projeto (destruir tudo):**
```
az group delete --name $RG --yes --no-wait
az group exists --name $RG
```
> ⚠️ O delete do RG remove discos, IP público e DNS privado junto.
> 📸 **PRINT #22** — `az group exists` retornando **false** (ou o RG ausente em `az group list -o table`).

---

## 14. Publicar no GitHub (portfólio) 🌟

### 14.1. Estrutura sugerida
```
projeto1-azure-webapp/
├── README.md
├── .gitignore
├── app/                  ← código Node.js (fase no Claude Code)
│   ├── src/  ├── package.json  └── .env.example
├── infra/
│   └── cloud-init.yaml   ← sem segredos
├── scripts/
│   └── provision.sh / provision.ps1   ← os comandos az deste roteiro
├── diagrama/  ├── arquitetura.drawio  └── arquitetura.png
├── evidencias/  └── print-01...png ... print-22...png
└── docs/  ├── relatorio-tecnico.md  └── relatorio-custos.md
```
> ✅ Diferencial: salvar os comandos `az` num `scripts/provision.sh` (e `.ps1`) — vira
> Infraestrutura-como-script, ótimo no portfólio.

### 14.2. `.gitignore`
```
node_modules/
.env
*.pem
*.key
*.log
.DS_Store
```

### 14.3. Git (CLI)
```
git init
git add .
git commit -m "Projeto 1: infraestrutura Azure (CLI) + app web escalável"
git branch -M main
git remote add origin https://github.com/<SEU_USUARIO>/projeto1-azure-webapp.git
git push -u origin main
```
> Autenticação: use **Personal Access Token** do GitHub no lugar da senha. ⚠️ Não comite o token.

### 14.4. README de portfólio (ordem recomendada)
Título + 1 frase → diagrama no topo → serviços Azure → como funciona (fluxo) → como provisionar
(link `scripts/`) → evidências (`/evidencias`) → custos (`docs/relatorio-custos.md` + nota free
tier/limpeza) → aprendizados/dificuldades → limpeza.

> 📸 **PRINT (extra, opcional)** — repositório no GitHub com README renderizado.

---

## 15. Checklist final

- [ ] RG + região (#1) · VNet + subnets (#2)
- [ ] nsg-web e nsg-db (#3, #4)
- [ ] Storage + container + arquivo (#5, #6)
- [ ] MySQL privado Burstable B1ms (#7)
- [ ] LB Standard: probe + regra + outbound (#8, #9)
- [ ] VMSS B1s + Managed Identity + role no blob (#10, #11, #12)
- [ ] Autoscale 2→3 por CPU (#13)
- [ ] App pelo LB: instância + lista de materiais do Blob (#14, #15)
- [ ] Banco lido e gravado (#16, #17)
- [ ] Teste de carga / scale-out (#18, #19)
- [ ] Pricing Calculator (#20) · Diagrama (#21)
- [ ] Relatório técnico (Seção 10) · GitHub publicado
- [ ] Recursos removidos (#22)

---

## 16. Especificação do app web (Node.js) — próxima fase

> Define **o que** o app faz; o código sai depois (Node.js no Claude Code), junto do `cloud-init.yaml`.

### 16.1. Stack
Node.js + **Express**; **mysql2** (driver com TLS — o Flexible Server exige conexão segura);
**@azure/identity** + **@azure/storage-blob** (ler o blob via Managed Identity, sem chave).

### 16.2. Rotas (conforme implementado em `app/`)
| Rota | Função | Exigência |
|---|---|---|
| `GET /health` | `200 OK` puro (não toca DB/Blob) | Health probe do LB (porta 8080) |
| `GET /` | Página inicial | Nome do projeto + instância + materiais do Blob + atividades do banco |
| `POST /atividade` | Insere linha no MySQL | "Registrar informação no banco" |
| `GET /material/:name` | Baixa um arquivo do Blob (streaming) | "Acessar arquivo no object storage" |
| `GET /db-test` | Diagnóstico (conexão + contagem) | Evidência de uso do banco |

### 16.3. Comportamentos-chave
- **Identificar instância**: `os.hostname()` e, se possível, `vmId`/`name` do **Azure IMDS**
  (`http://169.254.169.254/metadata/instance?api-version=2021-02-01`, header `Metadata: true`).
- **Banco**: pool de conexões, **TLS obrigatório**, credenciais por variáveis de ambiente; criar
  a tabela na 1ª execução (`atividades(id, aluno, titulo, descricao, criado_em)`).
- **Blob**: `DefaultAzureCredential` (Managed Identity) **lista** os arquivos e os **baixa por
  streaming** em `/material/:name` (sem chave; basta a role *Storage Blob Data Reader*).
- **Resiliência**: se o banco cair, a home ainda **carrega** (aviso amigável) para o health check
  não derrubar a instância.
- **Porta 8080** (não-root; LB mapeia 80→8080). **Logs** por requisição com o hostname.

### 16.4. Variáveis de ambiente (injetadas pelo cloud-init, NUNCA no repo)
```
PORT=8080
PROJECT_NAME=Byte Academy
DB_HOST=<fqdn-privado-do-mysql>
DB_USER=dbadmin
DB_PASS=<senha>
DB_NAME=appdb
DB_PORT=3306
STORAGE_ACCOUNT=stprojeto1<seunome>
BLOB_CONTAINER=materiais
```

### 16.5. `.env.example` (vai para o GitHub, sem segredos)
```
PORT=8080
PROJECT_NAME=Byte Academy
DB_HOST=changeme.mysql.database.azure.com
DB_USER=changeme
DB_PASS=changeme
DB_NAME=appdb
DB_PORT=3306
STORAGE_ACCOUNT=changeme
BLOB_CONTAINER=materiais
```

---

*Fim do roteiro. Próxima etapa: gerar o app Node.js (Seção 16) e o `cloud-init.yaml` da VMSS,
e então executar o passo 5.7.*
