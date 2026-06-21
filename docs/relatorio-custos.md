# Relatório de custo estimado mensal — Projeto 1 (Azure)

> Estimativa feita na **Azure Pricing Calculator** (azure.microsoft.com/pricing/calculator),
> usando as mesmas premissas do deploy. Substitua os valores `[...]` pelos que a calculadora
> mostrar para a sua região e configuração.

## Premissas

| Premissa | Valor |
|---|---|
| Região | [East US 2] |
| VMs (camada web) | 2× `Standard_B1s` (Linux), mín. 2 / máx. 3 (autoscale) |
| Banco gerenciado | Azure Database for MySQL Flexible Server, Burstable `B1ms`, 20 GB |
| Load Balancer | Standard + 1 regra + 1 outbound rule |
| Object storage | Blob Standard LRS, ~[1] GB |
| Disco das VMs | Managed disk de SO por instância (~[30] GB cada) |
| Horas de execução estimadas | [ex.: 60 h/mês — projeto ligado só durante os testes] |

## Estimativa mensal (itens exigidos)

| Item | Estimativa (USD/mês) |
|---|---|
| VMs (VMSS) — 2× B1s | [ ] |
| Banco gerenciado (MySQL B1ms) | [ ] |
| Load Balancer (Standard) | [ ] |
| Armazenamento de objetos (Blob LRS) | [ ] |
| Armazenamento em disco (discos de SO das VMs) | [ ] |
| Transferência de dados (saída) | [ ] |
| **Total estimado** | **[ ]** |

## Observações de custo

- **Free tier**: a conta gratuita inclui 750 h/mês do MySQL `B1ms` por 12 meses, além de
  créditos iniciais — o custo real tende a ~0 durante o projeto.
- **Controle de custo**: as VMs são desalocadas (`az vmss deallocate`) e o banco é parado
  (`az mysql flexible-server stop`) fora dos testes; ao final, o Resource Group é deletado.
- **Evitado**: NAT Gateway (substituído pela outbound rule do LB) e HA zonal do banco.

> 📸 Anexe aqui o print #20 (resumo da Pricing Calculator com o total).
