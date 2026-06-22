variable "subscription_id" {
  description = "ID da assinatura Azure (obrigatório no azurerm 4.x)."
  type        = string
}

variable "location" {
  description = "Região Azure. East US 2 costuma ser a mais barata; Brazil South reduz latência no BR."
  type        = string
  default     = "eastus2"
}

variable "resource_group_name" {
  description = "Nome do Resource Group."
  type        = string
  default     = "rg-projeto1-webapp"
}

variable "project_name" {
  description = "Nome exibido no topo da aplicação."
  type        = string
  default     = "Byte Academy"
}

# ---- Camada web (VMSS) ----
variable "admin_username" {
  description = "Usuário admin das VMs (acesso administrativo é feito via az vmss run-command, não por SSH exposto)."
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "Chave SSH pública (conteúdo). Gere com: ssh-keygen -t rsa -b 4096"
  type        = string
}

variable "vm_sku" {
  description = "Tamanho das VMs. B1s (burstable) é o menor que roda a app com folga."
  type        = string
  default     = "Standard_B1s"
}

variable "vm_instance_count" {
  description = "Quantidade inicial de instâncias (o autoscale assume o controle: mín. 2 / máx. 3)."
  type        = number
  default     = 2
}

# ---- Banco gerenciado ----
variable "mysql_name" {
  description = "Nome do MySQL Flexible Server (único na região)."
  type        = string
  default     = "mysql-projeto1-seunome"
}

variable "db_admin_user" {
  description = "Usuário admin do MySQL."
  type        = string
  default     = "dbadmin"
}

variable "db_admin_password" {
  description = "Senha admin do MySQL. NÃO comitar — use terraform.tfvars (ignorado pelo Git)."
  type        = string
  sensitive   = true
}

# ---- Storage ----
variable "storage_account_name" {
  description = "Nome da Storage Account (3-24 chars, minúsculas/números, ÚNICO no mundo)."
  type        = string
}

# ---- App / cloud-init ----
variable "github_repo_url" {
  description = "URL pública do repositório (o cloud-init faz git clone dele para subir a app)."
  type        = string
  default     = "https://github.com/SEU_USUARIO/azure-scalable-webapp.git"
}
