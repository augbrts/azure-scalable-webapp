# Terraform — Projeto 1 (Azure)

IaC equivalente ao `docs/roteiro.md` (CLI). Provisiona: VNet + subnets, NSGs, Storage + Blob
(`materiais`), MySQL Flexible Server privado (Burstable B1ms), Standard Load Balancer
(probe + regra + outbound rule), VM Scale Set com Managed Identity, e autoscale (2→3 por CPU).

## Pré-requisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- Azure CLI autenticado: `az login`
- Sua chave SSH pública (`~/.ssh/id_rsa.pub` ou gere uma: `ssh-keygen -t rsa -b 4096`)
- O repositório **publicado e público** no GitHub (o cloud-init faz `git clone` dele)

## Como usar

```bash
cd terraform

# 1) copie o modelo e preencha com os SEUS valores
cp terraform.tfvars.example terraform.tfvars
# edite terraform.tfvars: subscription_id, storage_account_name, mysql_name,
# db_admin_password, ssh_public_key, github_repo_url

# 2) inicializa o provider
terraform init

# 3) revise o que será criado
terraform plan

# 4) provisiona
terraform apply
```

Ao final, o Terraform mostra os `outputs` (`app_url`, `lb_public_ip`, `mysql_fqdn`,
`storage_account`). Suba os materiais de aula no container e teste:

```bash
# pega o nome do storage do output
STORAGE=$(terraform output -raw storage_account)
KEY=$(az storage account keys list -g rg-projeto1-webapp -n $STORAGE --query "[0].value" -o tsv)
az storage blob upload-batch --account-name $STORAGE --account-key $KEY --destination materiais --source ../caminho/para/seus/pdfs

# abre a app
terraform output -raw app_url
```

## ⚠️ Segredos

- `terraform.tfvars` (com a senha real) **nunca é commitado** — está no `.gitignore` desta pasta.
- O `*.tfstate` também fica de fora do Git: ele guarda os valores (inclusive sensíveis) em
  texto. Para um projeto solo/acadêmico, manter o state **local** é aceitável; para produção
  real, o ideal é um *remote backend* (ex.: Storage Account com `azurerm` backend).
- O `cloud-init.tftpl` é um **template**: o Terraform injeta os valores em tempo de `apply`,
  então a senha nunca aparece em texto fixo num arquivo do repositório.

## Diferenças em relação ao roteiro CLI

| | CLI (`scripts/provision.sh`) | Terraform |
|---|---|---|
| Reprodutibilidade | comandos em sequência | declarativo, com state |
| Atualização | reexecutar comandos manualmente | `terraform plan`/`apply` mostra o diff |
| Limpeza | `az group delete` | `terraform destroy` |
| Prints de evidência | ainda precisam ser capturados manualmente (Portal/CLI) — o Terraform não gera essa evidência | idem |

## Limpeza

```bash
terraform destroy
```
