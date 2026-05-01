output "api_endpoint" {
  description = "Base URL of the HTTP API."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "api_routes" {
  description = "Configured routes."
  value       = [for k, v in local.handlers : v.route_key]
}

output "lambda_function_names" {
  description = "Deployed Lambda function names."
  value       = { for k, fn in aws_lambda_function.this : k => fn.function_name }
}
