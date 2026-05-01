locals {
  handlers = {
    hello = {
      source_file = "${path.module}/../dist/hello.js"
      handler     = "hello.handler"
      route_key   = "GET /hello"
      env         = {}
    }
    chat = {
      source_file = "${path.module}/../dist/chat.js"
      handler     = "chat.handler"
      route_key   = "POST /chat"
      env         = {
        ANTHROPIC_API_KEY = var.anthropic_api_key
      }
    }
  }
}

data "archive_file" "lambda_zip" {
  for_each = local.handlers

  type        = "zip"
  source_file = each.value.source_file
  output_path = "${path.module}/build/${each.key}.zip"
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.handlers

  name              = "/aws/lambda/${local.name_prefix}-${each.key}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "this" {
  for_each = local.handlers

  function_name    = "${local.name_prefix}-${each.key}"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = var.lambda_runtime
  handler          = each.value.handler
  filename         = data.archive_file.lambda_zip[each.key].output_path
  source_code_hash = data.archive_file.lambda_zip[each.key].output_base64sha256
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  environment {
    variables = merge(
      {
        NODE_OPTIONS = "--enable-source-maps"
        ENVIRONMENT  = var.environment
      },
      each.value.env,
    )
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
}
