variable "subscription_id" {
  type        = string
}

variable "location" {
  type        = string
  default     = "eastus2"
}

variable "resource_group_name" {
  type        = string
  default     = "rg-projeto1-webapp"
}

variable "project_name" {
  type        = string
  default     = "Byte Academy"
}

variable "admin_username" {
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  type        = string
}

variable "vm_sku" {
  type        = string
  default     = "Standard_B1s"
}

variable "vm_instance_count" {
  type        = number
  default     = 2
}

variable "mysql_name" {
  type        = string
  default     = "mysql-projeto1-seunome"
}

variable "db_admin_user" {
  type        = string
  default     = "dbadmin"
}

variable "db_admin_password" {
  type        = string
  sensitive   = true
}

variable "storage_account_name" {
  type        = string
}
}
