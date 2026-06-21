# Evidências (prints)

Salve aqui os prints numerados, com nomes descritivos. Sugestão de nomenclatura:
`print-NN-descricao.png` (ex.: `print-14-app-no-lb.png`).

> ⚠️ Antes de salvar/commitar, confira que **não aparecem** senhas, connection strings, chaves
> de storage ou o `subscription id` em destaque (pode borrar).

## Lista de prints

| # | O que capturar | Evidência |
|---|---|---|
| 1 | `az group create` (RG + região) | Organização / região |
| 2 | `subnet list` (sub-redes pública e privada) | Rede virtual |
| 3 | regras do `nsg-web` | Segurança |
| 4 | regras do `nsg-db` (3306 só interno) | Segurança / banco protegido |
| 5 | `storage account create` | Object storage criado |
| 6 | `blob list` no container `materiais` | Object storage com arquivos |
| 6a | abrir um material pela tela (download) | Object storage utilizado |
| 7 | `mysql flexible-server show` (privado, B1ms) | Banco gerenciado criado |
| 8 | `lb probe list` (probe 8080/health) | Health check |
| 9 | `lb rule list` (80→8080) | Balanceador |
| 10 | `vmss list-instances` (2 instâncias) | Camada web |
| 11 | role assignment (Blob Data Reader) | Managed Identity |
| 12 | backend pool com instâncias registradas | Instâncias no balanceador |
| 13 | autoscale (min/max + regras de CPU) | Auto scaling configurado |
| 14 | app pelo `http://<LBIP>` (instância + materiais) | App pelo LB |
| 15 | recarga com outro hostname | Balanceamento |
| 16 | `/db-test` (conexão + contagem) | Banco utilizado |
| 17 | atividade gravada e listada | Banco utilizado |
| 18 | scale-out para 3 instâncias (sob carga) | Teste de escala |
| 19 | scale-in de volta para 2 (opcional) | Teste de escala |
| 20 | resumo da Pricing Calculator | Relatório de custo |
| 21 | diagrama finalizado | Diagrama |
| 22 | `az group exists` = false após delete | Recursos removidos |
