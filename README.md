# Aplicação Web Resiliente com Escalabilidade Automática (Azure)

Infraestrutura escalável na Microsoft Azure hospedando um portal institucional simples
(**Byte Academy**): os alunos veem materiais de aula e postam atividades. A aplicação roda
atrás de um **Load Balancer**, sobre um **VM Scale Set com auto scaling**, usando **banco de
dados gerenciado** (MySQL) e **armazenamento de objetos** (Blob), tudo dentro de uma rede
virtual com sub-redes pública e privada.

## Arquitetura

```
Internet → IP Público (Standard) → Load Balancer (Standard)
                                             → VM Scale Set (autoscale 2→3, subnet pública)
                                                           ├─ MySQL Flexible Server (subnet privada, sem IP público)
                                                           └─ Blob Storage (materiais de aula, lido via Managed Identity)
```

## Serviços Azure utilizados

Virtual Network, Sub-redes pública e privada, VM Scale Set, Standard Load Balancer,
Azure Database for MySQL Flexible Server, Blob Storage, Network Security Groups,
Azure Monitor (auto scaling), Managed Identity.

## Como funciona

1. O usuário acessa o **IP público do Load Balancer** (porta 80).
2. O LB distribui as requisições entre as instâncias da **VM Scale Set** (porta 8080) e usa um
   **health check** em `/health`.
3. A aplicação **lista os materiais** do **Blob Storage** (via Managed Identity, sem chave) e
   **grava/listas atividades** no **MySQL** gerenciado (acesso privado, sem exposição à internet).
4. O **auto scaling** sobe de 2 para 3 instâncias quando a CPU passa de 70%.
5. Cada página mostra **qual instância respondeu** — evidência do balanceamento.

## Estrutura do repositório

```
.
├── app/          # aplicação Node.js (Express) — ver app/README.md
├── infra/        # cloud-init.yaml que provisiona a app na VMSS
├── scripts/      # provisionamento via Azure CLI (bash e PowerShell)
├── diagrama/     # diagrama de arquitetura (draw.io + PNG)
├── docs/         # roteiro completo + relatórios técnico e de custos
└── evidencias/   # prints exigidos na avaliação
```

## Como provisionar (resumo)

Pré-requisitos: conta Azure (free account), **Azure CLI** e **Git**.

```bash
az login
# defina suas variáveis e a senha do banco (ver scripts/)
bash scripts/provision.sh        # ou: pwsh scripts/provision.ps1
```

## Custos

A solução foi dimensionada para o menor custo possível: VMs `B1s`, MySQL `B1ms` (burstable, no
free tier), storage `LRS`, sem alta disponibilidade zonal e **saída de internet via outbound rule
do Load Balancer** (evita o custo do NAT Gateway). A estimativa mensal e as premissas estão em
[`docs/relatorio-custos.md`](docs/relatorio-custos.md). O custo real tende a centavos com o free
tier e desligando/deletando os recursos fora de uso.

## Limpeza

```bash
az group delete --name rg-projeto1-webapp --yes --no-wait
```

## Boas práticas adotadas

- Banco gerenciado **sem endpoint público** (acesso só pela rede virtual).
- **Managed Identity** para ler o Blob (sem chave de storage no código).
- **NSGs restritivos**: 80 público, 3306 só interno, 22 só do IP do operador.
- **Sem segredos no repositório** (`.env` e cloud-init preenchido ficam fora do Git).
- App como usuário sem privilégio, queries parametrizadas e escape de HTML.

---

*Aplicação web de demonstração para fins acadêmicos.*
