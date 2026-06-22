output "app_url" {
  description = "URL pública da aplicação (pelo Load Balancer)."
  value       = "http://${azurerm_public_ip.lb.ip_address}"
}

output "lb_public_ip" {
  description = "IP público do Load Balancer."
  value       = azurerm_public_ip.lb.ip_address
}

output "mysql_fqdn" {
  description = "FQDN privado do MySQL Flexible Server."
  value       = azurerm_mysql_flexible_server.db.fqdn
}

output "storage_account" {
  description = "Nome da Storage Account (suba os materiais no container 'materiais')."
  value       = azurerm_storage_account.st.name
}

output "resource_group" {
  description = "Resource Group criado."
  value       = azurerm_resource_group.rg.name
}
