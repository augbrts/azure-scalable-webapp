# Relatório técnico — Projeto 1 (Azure)

> Preencha os campos entre colchetes. A estrutura segue exatamente os itens exigidos no
> enunciado (Entregáveis → Relatório técnico).

## 1. Provedor escolhido
Microsoft Azure. [Justifique brevemente: familiaridade, free tier, etc.]

## 2. Região utilizada
[Ex.: East US 2 — escolhida por ser uma das regiões de menor custo. / Ou Brazil South, por
latência no Brasil, ao custo de preços um pouco maiores.]

## 3. Serviços provisionados
- Virtual Network (`vnet-projeto1`) com `subnet-web` (pública) e `subnet-db` (privada)
- Network Security Groups (`nsg-web`, `nsg-db`)
- Storage Account + Blob (container `materiais`)
- Azure Database for MySQL Flexible Server (Burstable B1ms, acesso privado)
- Standard Load Balancer (`lb-projeto1`) + IP público
- VM Scale Set (`vmss-web`, Standard_B1s) com Managed Identity
- Azure Monitor (autoscale 2→3 por CPU)

## 4. Justificativa da arquitetura
[Explique as escolhas — pode reusar a tabela de decisões do roteiro:]
- **Load Balancer (L4)** em vez de Application Gateway (L7): menor custo; não precisamos de WAF
  nem roteamento por URL.
- **MySQL** (entre MySQL/PostgreSQL): driver simples no Node e free tier de 12 meses (B1ms).
- **B1s/B1ms (burstable)**: menor custo que ainda atende a carga do projeto.
- **Banco com acesso privado** (VNet): atende ao requisito de não expor o banco à internet.
- **Managed Identity** para o Blob: sem chave de storage no código.
- **Outbound rule no LB** em vez de NAT Gateway: dá saída de internet às VMs sem custo extra.

## 5. Evidências de funcionamento
[Insira/aponte os prints #14 (app pelo LB), #16 (db-test) e #17 (atividade gravada).]

## 6. Evidências do balanceamento
[Prints #12 (instâncias no backend pool), #14 e #15 (hostnames diferentes a cada recarga).]

## 7. Evidências do auto scaling
[Prints #13 (regras de autoscale), #18 (scale-out para 3) e #19 (scale-in para 2).]

## 8. Principais dificuldades encontradas
[Relate as suas. Exemplos comuns neste projeto:]
- Standard LB é "secure by default" — foi preciso configurar NSG (entrada) e outbound rule (saída).
- A `subnet-db` precisa estar vazia para ser delegada ao MySQL Flexible Server.
- Ordem importa: criar o Load Balancer antes da VMSS, para o cloud-init ter saída de internet.

## 9. Procedimento de limpeza dos recursos
```bash
az group delete --name rg-projeto1-webapp --yes --no-wait
az group exists --name rg-projeto1-webapp   # deve retornar false
```
[Insira o print #22 confirmando a remoção.]
