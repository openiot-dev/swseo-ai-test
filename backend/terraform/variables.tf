variable "project_name" {
  type        = string
  description = "Resource name prefix."
  default     = "swseo-ai-test"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)."
  default     = "dev"
}

variable "aws_region" {
  type        = string
  description = "AWS region to deploy into."
  default     = "ap-northeast-2"
}

variable "lambda_runtime" {
  type        = string
  description = "Lambda runtime."
  default     = "nodejs20.x"
}

variable "lambda_memory_size" {
  type        = number
  description = "Lambda memory in MB."
  default     = 256
}

variable "lambda_timeout" {
  type        = number
  description = "Lambda timeout in seconds."
  default     = 10
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days."
  default     = 14
}

variable "anthropic_api_key" {
  type        = string
  description = "Anthropic API key for the chat Lambda."
  sensitive   = true
}
