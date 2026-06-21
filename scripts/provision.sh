#!/usr/bin/env bash
# ===========================================================================
# Provisionamento do Projeto 1 (Azure) via Azure CLI — Git Bash / Linux / macOS
# Executa os recursos na ordem correta. Alguns passos têm toque manual
# (upload dos materiais, preencher cloud-init, publicar o repo) — ver marcações.
#
# Uso:
#   export DBPASS="SuaSenhaForte!123"   # NÃO deixe a senha hardcoded aqui
#   bash scripts/provision.sh
# ===========================================================================
set -euo pipefail

# --------- Variáveis (ajuste o que for seu) ---------
RG="rg-projeto1-webapp"
LOC="eastus2"
VNET="vnet-projeto1"
ST="stprojeto1seunome"          # 3-24 chars, minúsculas/números, ÚNICO no mundo
MYSQL="mysql-projeto1-seunome"
GH_USER="SEU_USUARIO_GITHUB"    # usado só como lembrete; o clone é feito pelo cloud-init
: "${DBPASS:?Defina a variavel DBPASS antes de rodar (export DBPASS=...)}"

echo ">> Login/contexto:"; az account show -o table

# --------- 5.1 Resource Group ---------
az group create --name "$RG" --location "$LOC"

# --------- 5.2 VNet + sub-redes ---------
az network vnet create --resource-group "$RG" --name "$VNET" --address-prefix 10.10.0.0/16 --subnet-name subnet-web --subnet-prefix 10.10.1.0/24
az network vnet subnet create --resource-group "$RG" --vnet-name "$VNET" --name subnet-db --address-prefix 10.10.2.0/24

# --------- 5.3 NSGs + regras ---------
az network nsg create --resource-group "$RG" --name nsg-web
az network nsg create --resource-group "$RG" --name nsg-db
MYIP="$(curl -s ifconfig.me)"
az network nsg rule create --resource-group "$RG" --nsg-name nsg-web --name allow-http --priority 100 --protocol Tcp --destination-port-ranges 80 --access Allow --direction Inbound --source-address-prefixes Internet
az network nsg rule create --resource-group "$RG" --nsg-name nsg-web --name allow-probe --priority 110 --protocol Tcp --destination-port-ranges 8080 --access Allow --direction Inbound --source-address-prefixes AzureLoadBalancer
az network nsg rule create --resource-group "$RG" --nsg-name nsg-web --name allow-ssh-meu-ip --priority 120 --protocol Tcp --destination-port-ranges 22 --access Allow --direction Inbound --source-address-prefixes "$MYIP"
az network nsg rule create --resource-group "$RG" --nsg-name nsg-db --name allow-mysql-from-web --priority 100 --protocol Tcp --destination-port-ranges 3306 --access Allow --direction Inbound --source-address-prefixes 10.10.1.0/24
az network vnet subnet update --resource-group "$RG" --vnet-name "$VNET" --name subnet-web --network-security-group nsg-web
az network vnet subnet update --resource-group "$RG" --vnet-name "$VNET" --name subnet-db --network-security-group nsg-db

# --------- 5.4 Storage + container materiais ---------
az storage account create --resource-group "$RG" --name "$ST" --location "$LOC" --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false
KEY="$(az storage account keys list -g "$RG" -n "$ST" --query "[0].value" -o tsv)"
az storage container create --account-name "$ST" --account-key "$KEY" --name materiais --public-access off
echo ">> TOQUE MANUAL: suba seus materiais de aula (PDFs etc.) no container 'materiais':"
echo "   az storage blob upload-batch --account-name $ST --account-key \$KEY --destination materiais --source ."

# --------- 5.5 MySQL Flexible Server (privado) ---------
az mysql flexible-server create --resource-group "$RG" --name "$MYSQL" --location "$LOC" --admin-user dbadmin --admin-password "$DBPASS" --sku-name Standard_B1ms --tier Burstable --storage-size 20 --version 8.0.21 --vnet "$VNET" --subnet subnet-db --private-dns-zone projeto1.private.mysql.database.azure.com --high-availability Disabled --yes
az mysql flexible-server db create --resource-group "$RG" --server-name "$MYSQL" --database-name appdb

# --------- 5.6 Load Balancer (antes da VMSS) ---------
az network public-ip create --resource-group "$RG" --name pip-lb-projeto1 --sku Standard --allocation-method Static
az network lb create --resource-group "$RG" --name lb-projeto1 --sku Standard --public-ip-address pip-lb-projeto1 --frontend-ip-name feip --backend-pool-name bepool
az network lb probe create --resource-group "$RG" --lb-name lb-projeto1 --name probe-8080 --protocol Http --port 8080 --path /health
az network lb rule create --resource-group "$RG" --lb-name lb-projeto1 --name rule-http --protocol Tcp --frontend-port 80 --backend-port 8080 --frontend-ip-name feip --backend-pool-name bepool --probe-name probe-8080 --disable-outbound-snat true
az network lb outbound-rule create --resource-group "$RG" --lb-name lb-projeto1 --name outrule --frontend-ip-configs feip --protocol All --address-pool bepool

# --------- 5.7 VMSS — exige cloud-init preenchido e repo publicado ---------
echo ">> ANTES DA VMSS: preencha infra/cloud-init.yaml (FQDN do MySQL, senha, storage, usuario GitHub)"
echo "   FQDN do MySQL: $(az mysql flexible-server show -g "$RG" -n "$MYSQL" --query fullyQualifiedDomainName -o tsv)"
read -r -p "Cloud-init preenchido e repo '$GH_USER/projeto1-azure-webapp' publicado? [s/N] " OK
if [ "${OK:-N}" = "s" ] || [ "${OK:-N}" = "S" ]; then
  az vmss create --resource-group "$RG" --name vmss-web --image Ubuntu2204 --vm-sku Standard_B1s --instance-count 2 --vnet-name "$VNET" --subnet subnet-web --lb lb-projeto1 --backend-pool-name bepool --admin-username azureuser --generate-ssh-keys --assign-identity --custom-data infra/cloud-init.yaml --upgrade-policy-mode Automatic
  PRIN="$(az vmss identity show -g "$RG" -n vmss-web --query principalId -o tsv)"
  STID="$(az storage account show -g "$RG" -n "$ST" --query id -o tsv)"
  az role assignment create --assignee "$PRIN" --role "Storage Blob Data Reader" --scope "$STID"

  # --------- 5.8 Auto Scaling ---------
  az monitor autoscale create --resource-group "$RG" --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets --name autoscale-vmss --min-count 2 --max-count 3 --count 2
  az monitor autoscale rule create --resource-group "$RG" --autoscale-name autoscale-vmss --condition "Percentage CPU > 70 avg 5m" --scale out 1
  az monitor autoscale rule create --resource-group "$RG" --autoscale-name autoscale-vmss --condition "Percentage CPU < 30 avg 5m" --scale in 1

  LBIP="$(az network public-ip show -g "$RG" -n pip-lb-projeto1 --query ipAddress -o tsv)"
  echo ">> Pronto. Acesse: http://$LBIP"
else
  echo ">> VMSS adiada. Rode novamente após preencher o cloud-init e publicar o repo."
fi
