terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  # Obrigatório no azurerm 4.x. Pode vir daqui (var) ou da env ARM_SUBSCRIPTION_ID.
  subscription_id = var.subscription_id
  features {}
}
