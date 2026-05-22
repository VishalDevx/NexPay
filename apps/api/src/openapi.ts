export function generateOpenApiSpec(): Record<string, any> {
  return {
    openapi: "3.0.3",
    info: {
      title: "NexPay API",
      version: "1.0.0",
      description:
        "NexPay Payment Processing API – Create charges, manage customers, handle disputes, process payouts, and more.\n\nBase URL: `https://api.nexpay.com`",
      contact: {
        name: "NexPay Support",
        email: "support@nexpay.com",
        url: "https://nexpay.com/support",
      },
    },
    servers: [
      { url: "https://api.nexpay.com", description: "Production" },
      { url: "https://sandbox.nexpay.com", description: "Sandbox" },
    ],
    paths: {
      "/api/v1/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description: "Returns API health status and version info.",
          operationId: "healthCheck",
          responses: {
            "200": {
              description: "Service healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      service: { type: "string", example: "nexpay-api" },
                      version: { type: "string", example: "1.0.0" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/merchants/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "Register merchant",
          description: "Create a new merchant account.",
          operationId: "registerMerchant",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string", example: "Acme Inc" },
                    email: { type: "string", format: "email", example: "admin@acme.com" },
                    password: { type: "string", format: "password", minLength: 8, example: "securePass123" },
                    country: { type: "string", example: "IN" },
                    businessType: { type: "string", example: "retail" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Merchant registered successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      merchant: { $ref: "#/components/schemas/Merchant" },
                      token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                    },
                  },
                },
              },
            },
            "409": { description: "Email already exists" },
            "422": { description: "Validation error" },
          },
        },
      },

      "/api/v1/merchants/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Login",
          description: "Authenticate with email and password to receive a JWT token.",
          operationId: "loginMerchant",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "admin@acme.com" },
                    password: { type: "string", format: "password", example: "securePass123" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      merchant: { $ref: "#/components/schemas/Merchant" },
                      token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                      mfaRequired: { type: "boolean", example: false },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },

      "/api/v1/merchants/auth/send-otp": {
        post: {
          tags: ["Authentication"],
          summary: "Send email OTP",
          description: "Send a one-time password to the merchant's email address for verification.",
          operationId: "sendOtp",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "admin@acme.com" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OTP sent successfully" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },

      "/api/v1/merchants/auth/verify-otp": {
        post: {
          tags: ["Authentication"],
          summary: "Verify OTP",
          description: "Verify an OTP sent to the merchant's email.",
          operationId: "verifyOtp",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "otp"],
                  properties: {
                    email: { type: "string", format: "email", example: "admin@acme.com" },
                    otp: { type: "string", example: "123456" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OTP verified successfully" },
            "400": { description: "Invalid or expired OTP" },
          },
        },
      },

      "/api/v1/merchants/auth/password-reset-request": {
        post: {
          tags: ["Authentication"],
          summary: "Request password reset",
          description: "Request a password reset link to be sent to the merchant's email.",
          operationId: "passwordResetRequest",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "admin@acme.com" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Reset request processed" } },
        },
      },

      "/api/v1/merchants/auth/password-reset-confirm": {
        post: {
          tags: ["Authentication"],
          summary: "Confirm password reset",
          description: "Reset the password using the token received via email.",
          operationId: "passwordResetConfirm",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "token", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "admin@acme.com" },
                    token: { type: "string", example: "reset-token-value" },
                    password: { type: "string", format: "password", minLength: 8, example: "newSecurePass456" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Password reset complete" },
            "400": { description: "Invalid or expired token" },
          },
        },
      },

      "/api/v1/merchants/auth/verify-totp": {
        post: {
          tags: ["Authentication"],
          summary: "Verify TOTP (MFA)",
          description: "Second-factor authentication using TOTP.",
          operationId: "verifyTotp",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "token"],
                  properties: {
                    email: { type: "string", format: "email" },
                    token: { type: "string", description: "TOTP code from authenticator app" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "TOTP verified" },
            "401": { description: "MFA not configured or invalid token" },
          },
        },
      },

      "/api/v1/merchants/auth/verify-backup-code": {
        post: {
          tags: ["Authentication"],
          summary: "Verify backup code",
          description: "Use a backup code to authenticate when MFA device is unavailable.",
          operationId: "verifyBackupCode",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "code"],
                  properties: {
                    email: { type: "string", format: "email" },
                    code: { type: "string", description: "One of the backup codes from setup" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Backup code accepted" } },
        },
      },

      "/api/v1/merchants/mfa/totp/setup": {
        post: {
          tags: ["Merchant Settings"],
          summary: "Setup TOTP MFA",
          description: "Generate TOTP secret and backup codes for multi-factor authentication.",
          operationId: "setupTotp",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "TOTP setup info",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      secret: { type: "string" },
                      uri: { type: "string", description: "otpauth:// URI for QR code" },
                      backupCodes: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/merchants/mfa/totp/enable": {
        post: {
          tags: ["Merchant Settings"],
          summary: "Enable TOTP MFA",
          operationId: "enableTotp",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token"],
                  properties: { token: { type: "string", description: "TOTP code to verify" } },
                },
              },
            },
          },
          responses: { "200": { description: "TOTP enabled" } },
        },
      },

      "/api/v1/merchants/mfa/totp/disable": {
        post: {
          tags: ["Merchant Settings"],
          summary: "Disable TOTP MFA",
          operationId: "disableTotp",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "TOTP disabled" } },
        },
      },

      "/api/v1/merchants/mfa/sms/setup": {
        post: {
          tags: ["Merchant Settings"],
          summary: "Setup SMS MFA",
          operationId: "setupSmsMfa",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["phone"],
                  properties: { phone: { type: "string", example: "+919876543210" } },
                },
              },
            },
          },
          responses: { "200": { description: "SMS MFA configured" } },
        },
      },

      "/api/v1/merchants/me": {
        get: {
          tags: ["Merchant Profile"],
          summary: "Get merchant profile",
          operationId: "getMerchantProfile",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Merchant profile",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Merchant" } } },
            },
          },
        },
        patch: {
          tags: ["Merchant Profile"],
          summary: "Update merchant profile",
          operationId: "updateMerchantProfile",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    country: { type: "string" },
                    businessType: { type: "string" },
                    recoveryEmail: { type: "string", format: "email" },
                    baseCurrency: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Profile updated" } },
        },
      },

      "/api/v1/merchants/profile": {
        get: {
          tags: ["Merchant Profile"],
          summary: "Get merchant profile (alias)",
          operationId: "getMerchantProfileAlias",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Merchant profile",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Merchant" } } },
            },
          },
        },
      },

      "/api/v1/merchants/api-keys": {
        post: {
          tags: ["API Keys"],
          summary: "Create API key",
          description: "Generate a new API key for programmatic access.",
          operationId: "createApiKey",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    env: { type: "string", enum: ["LIVE", "TEST"], example: "TEST" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "API key created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      apiKey: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          prefix: { type: "string" },
                          env: { type: "string" },
                          key: { type: "string", description: "Full raw key — shown only once" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        get: {
          tags: ["API Keys"],
          summary: "List API keys",
          operationId: "listApiKeys",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of API keys",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/ApiKey" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/merchants/api-keys/{id}": {
        delete: {
          tags: ["API Keys"],
          summary: "Revoke API key",
          operationId: "revokeApiKey",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: { "200": { description: "API key revoked" } },
        },
      },

      "/api/v1/merchants/webhooks": {
        post: {
          tags: ["Webhooks"],
          summary: "Create webhook endpoint",
          operationId: "createWebhookEndpoint",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url", "events"],
                  properties: {
                    url: { type: "string", format: "uri", example: "https://example.com/webhook" },
                    events: {
                      type: "array",
                      items: { type: "string" },
                      example: ["payment.success", "payment.failed"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Webhook endpoint created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      endpoint: { $ref: "#/components/schemas/WebhookEndpoint" },
                    },
                  },
                },
              },
            },
          },
        },
        get: {
          tags: ["Webhooks"],
          summary: "List webhook endpoints",
          operationId: "listWebhookEndpoints",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "List of webhook endpoints",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/WebhookEndpoint" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/merchants/webhooks/{id}": {
        delete: {
          tags: ["Webhooks"],
          summary: "Delete webhook endpoint",
          operationId: "deleteWebhookEndpoint",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: { "200": { description: "Webhook deleted" } },
        },
      },

      "/api/v1/merchants/webhooks/deliveries": {
        get: {
          tags: ["Webhooks"],
          summary: "List webhook deliveries",
          operationId: "listWebhookDeliveries",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "List of webhook deliveries",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/WebhookDelivery" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/merchants/webhooks/deliveries/{id}/replay": {
        post: {
          tags: ["Webhooks"],
          summary: "Replay webhook delivery",
          operationId: "replayWebhookDelivery",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: { "200": { description: "Webhook re-queued for delivery" } },
        },
      },

      "/api/v1/payments/charges": {
        post: {
          tags: ["Payments"],
          summary: "Create a charge",
          description: "Create a new payment charge.",
          operationId: "createCharge",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount", "payment_method"],
                  properties: {
                    amount: { type: "number", example: 10000, description: "Amount in smallest currency unit (e.g., paise)" },
                    currency: { type: "string", default: "INR", example: "INR" },
                    customer_id: { type: "string", format: "uuid" },
                    payment_method: { type: "string", example: "upi" },
                    description: { type: "string" },
                    metadata: { type: "object", additionalProperties: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Charge created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Payment" },
                },
              },
            },
            "422": { description: "Charge failed" },
          },
        },
        get: {
          tags: ["Payments"],
          summary: "List charges",
          description: "Retrieve a paginated list of charges for the merchant.",
          operationId: "listCharges",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "customer_id", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "List of charges",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Payment" } },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/payments/charges/{id}": {
        get: {
          tags: ["Payments"],
          summary: "Get a charge",
          description: "Retrieve details of a specific charge.",
          operationId: "getCharge",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Charge details",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Payment" } },
              },
            },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },

      "/api/v1/payments/charges/{id}/capture": {
        post: {
          tags: ["Payments"],
          summary: "Capture a charge",
          description: "Capture an authorized payment.",
          operationId: "captureCharge",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Charge captured" },
            "422": { description: "Capture failed" },
          },
        },
      },

      "/api/v1/payments/charges/{id}/cancel": {
        post: {
          tags: ["Payments"],
          summary: "Cancel a charge",
          description: "Cancel a payment before it is captured.",
          operationId: "cancelCharge",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { reason: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "Charge cancelled" },
            "422": { description: "Cancel failed" },
          },
        },
      },

      "/api/v1/payments/charges/{id}/refund": {
        post: {
          tags: ["Payments"],
          summary: "Refund a charge",
          description: "Refund a captured payment partially or in full.",
          operationId: "refundCharge",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "number", description: "Partial refund amount in smallest currency unit" },
                    reason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Refund issued", content: { "application/json": { schema: { $ref: "#/components/schemas/Refund" } } } },
            "422": { description: "Refund failed" },
          },
        },
      },

      "/api/v1/payments/charges/{id}/events": {
        get: {
          tags: ["Payments"],
          summary: "List payment events",
          operationId: "listPaymentEvents",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Payment event timeline",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            fromStatus: { type: "string" },
                            toStatus: { type: "string" },
                            actor: { type: "string" },
                            reason: { type: "string" },
                            createdAt: { type: "string", format: "date-time" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/payments/charges/{id}/ledger": {
        get: {
          tags: ["Payments"],
          summary: "Get payment ledger entries",
          operationId: "getPaymentLedger",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Ledger entries for payment",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/LedgerEntry" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/customers": {
        post: {
          tags: ["Customers"],
          summary: "Create a customer",
          description: "Create or retrieve an existing customer by email.",
          operationId: "createCustomer",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                    name: { type: "string" },
                    phone: { type: "string" },
                    metadata: { type: "object", additionalProperties: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Customer created", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
            "200": { description: "Existing customer returned" },
          },
        },
        get: {
          tags: ["Customers"],
          summary: "List customers",
          operationId: "listCustomers",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Customer list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Customer" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/customers/{id}": {
        get: {
          tags: ["Customers"],
          summary: "Get a customer",
          operationId: "getCustomer",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Customer details", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },

      "/api/v1/customers/{id}/payments": {
        get: {
          tags: ["Customers"],
          summary: "List customer payments",
          operationId: "listCustomerPayments",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Customer payments",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Payment" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/disputes": {
        post: {
          tags: ["Disputes"],
          summary: "Create a dispute",
          description: "Raise a dispute against a payment.",
          operationId: "createDispute",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["payment_id", "reason", "amount"],
                  properties: {
                    payment_id: { type: "string", format: "uuid" },
                    reason: { type: "string" },
                    amount: { type: "number" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Dispute created", content: { "application/json": { schema: { $ref: "#/components/schemas/Dispute" } } } },
          },
        },
        get: {
          tags: ["Disputes"],
          summary: "List disputes",
          operationId: "listDisputes",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Dispute list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Dispute" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/disputes/{id}/evidence": {
        post: {
          tags: ["Disputes"],
          summary: "Submit dispute evidence",
          operationId: "submitDisputeEvidence",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    evidence: { type: "object", additionalProperties: true },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Evidence submitted" } },
        },
      },

      "/api/v1/payouts": {
        post: {
          tags: ["Payouts"],
          summary: "Create a payout",
          operationId: "createPayout",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount"],
                  properties: {
                    amount: { type: "number", description: "Amount in smallest currency unit" },
                    currency: { type: "string", default: "INR" },
                    scheduled_for: { type: "string", format: "date-time", description: "Optional future date for scheduled payout" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Payout created", content: { "application/json": { schema: { $ref: "#/components/schemas/Payout" } } } },
          },
        },
        get: {
          tags: ["Payouts"],
          summary: "List payouts",
          operationId: "listPayouts",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Payout list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Payout" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/wallets/balance": {
        get: {
          tags: ["Wallets"],
          summary: "Get wallet balances",
          operationId: "getWalletBalances",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Wallet balances",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            currency: { type: "string" },
                            balance: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/wallets/load": {
        post: {
          tags: ["Wallets"],
          summary: "Load wallet",
          description: "Add funds to the merchant wallet.",
          operationId: "loadWallet",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currency", "amount"],
                  properties: {
                    currency: { type: "string", example: "INR" },
                    amount: { type: "number", example: 50000 },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Wallet loaded" } },
        },
      },

      "/api/v1/wallets/withdraw": {
        post: {
          tags: ["Wallets"],
          summary: "Withdraw from wallet",
          operationId: "withdrawWallet",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currency", "amount"],
                  properties: {
                    currency: { type: "string" },
                    amount: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Withdrawal processed" } },
        },
      },

      "/api/v1/bank-accounts": {
        post: {
          tags: ["Bank Accounts"],
          summary: "Add bank account",
          operationId: "addBankAccount",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["accountNumber", "ifsc"],
                  properties: {
                    accountNumber: { type: "string" },
                    ifsc: { type: "string", example: "HDFC0001234" },
                    accountHolder: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Bank account added" } },
        },
        get: {
          tags: ["Bank Accounts"],
          summary: "List bank accounts",
          operationId: "listBankAccounts",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Bank account list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/BankAccount" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/bank-accounts/{id}/verify": {
        post: {
          tags: ["Bank Accounts"],
          summary: "Verify bank account",
          operationId: "verifyBankAccount",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount1", "amount2"],
                  properties: {
                    amount1: { type: "number" },
                    amount2: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Bank account verified" } },
        },
      },

      "/api/v1/bank-accounts/{id}/primary": {
        patch: {
          tags: ["Bank Accounts"],
          summary: "Set primary bank account",
          operationId: "setPrimaryBankAccount",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Primary updated" } },
        },
      },

      "/api/v1/bank-accounts/{id}": {
        delete: {
          tags: ["Bank Accounts"],
          summary: "Delete bank account",
          operationId: "deleteBankAccount",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Bank account deleted" } },
        },
      },

      "/api/v1/invoices": {
        get: {
          tags: ["Invoices"],
          summary: "List invoices",
          operationId: "listInvoices",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "sortBy", in: "query", schema: { type: "string" } },
            { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          ],
          responses: {
            "200": {
              description: "Invoice list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Invoice" } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Invoices"],
          summary: "Create an invoice",
          operationId: "createInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["customerName", "lineItems"],
                  properties: {
                    customerName: { type: "string" },
                    customerEmail: { type: "string", format: "email" },
                    customerGstin: { type: "string" },
                    lineItems: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          description: { type: "string" },
                          quantity: { type: "number" },
                          unitPrice: { type: "number" },
                        },
                      },
                    },
                    taxRate: { type: "number", default: 18 },
                    dueDate: { type: "string", format: "date" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Invoice created" } },
        },
      },

      "/api/v1/invoices/{id}": {
        get: {
          tags: ["Invoices"],
          summary: "Get an invoice",
          operationId: "getInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "Invoice details", content: { "application/json": { schema: { $ref: "#/components/schemas/Invoice" } } } },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        patch: {
          tags: ["Invoices"],
          summary: "Update an invoice",
          operationId: "updateInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    customerName: { type: "string" },
                    customerEmail: { type: "string" },
                    lineItems: { type: "array", items: { type: "object" } },
                    taxRate: { type: "number" },
                    dueDate: { type: "string", format: "date" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Invoice updated" } },
        },
      },

      "/api/v1/invoices/{id}/send": {
        post: {
          tags: ["Invoices"],
          summary: "Send an invoice",
          operationId: "sendInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Invoice sent" } },
        },
      },

      "/api/v1/invoices/{id}/pay": {
        post: {
          tags: ["Invoices"],
          summary: "Mark invoice as paid",
          operationId: "payInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Invoice marked as paid" } },
        },
      },

      "/api/v1/invoices/{id}/cancel": {
        post: {
          tags: ["Invoices"],
          summary: "Cancel an invoice",
          operationId: "cancelInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Invoice cancelled" } },
        },
      },

      "/api/v1/invoices/recurring": {
        get: {
          tags: ["Invoices"],
          summary: "List recurring invoice templates",
          operationId: "listRecurringInvoices",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Recurring invoice templates" } },
        },
        post: {
          tags: ["Invoices"],
          summary: "Create recurring invoice template",
          operationId: "createRecurringInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["customerName", "lineItems", "frequency"],
                  properties: {
                    customerName: { type: "string" },
                    customerEmail: { type: "string" },
                    lineItems: { type: "array", items: { type: "object" } },
                    frequency: { type: "string", enum: ["weekly", "monthly", "quarterly", "yearly"] },
                    taxRate: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Recurring template created" } },
        },
      },

      "/api/v1/invoices/recurring/{id}": {
        delete: {
          tags: ["Invoices"],
          summary: "Delete recurring invoice template",
          operationId: "deleteRecurringInvoice",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } },
        },
      },

      "/api/v1/invoices/tax": {
        get: {
          tags: ["Invoices"],
          summary: "Get tax configuration",
          operationId: "getTaxConfig",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Tax configuration" } },
        },
        put: {
          tags: ["Invoices"],
          summary: "Update tax configuration",
          operationId: "updateTaxConfig",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    gstin: { type: "string" },
                    hsnCode: { type: "string" },
                    gstRate: { type: "number" },
                    tdsRate: { type: "number" },
                    tdsSection: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Tax config updated" } },
        },
      },

      "/api/v1/team": {
        get: {
          tags: ["Team"],
          summary: "List team members",
          operationId: "listTeamMembers",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Team members",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/TeamMember" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/team/invite": {
        post: {
          tags: ["Team"],
          summary: "Invite team member",
          operationId: "inviteTeamMember",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "role"],
                  properties: {
                    email: { type: "string", format: "email" },
                    name: { type: "string" },
                    role: { type: "string", enum: ["OWNER", "ADMIN", "DEVELOPER", "FINANCE", "READ_ONLY"] },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Invitation sent" } },
        },
      },

      "/api/v1/team/{id}": {
        patch: {
          tags: ["Team"],
          summary: "Update team member role",
          operationId: "updateTeamMemberRole",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { role: { type: "string" } },
                },
              },
            },
          },
          responses: { "200": { description: "Role updated" } },
        },
        delete: {
          tags: ["Team"],
          summary: "Remove team member",
          operationId: "removeTeamMember",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Member removed" } },
        },
      },

      "/api/v1/team/{id}/resend-invite": {
        post: {
          tags: ["Team"],
          summary: "Resend invitation",
          operationId: "resendTeamInvite",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Invitation resent" } },
        },
      },

      "/api/v1/sessions": {
        get: {
          tags: ["Sessions"],
          summary: "List active sessions",
          operationId: "listSessions",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Active sessions",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            deviceInfo: { type: "string" },
                            ip: { type: "string" },
                            isCurrent: { type: "boolean" },
                            lastUsedAt: { type: "string", format: "date-time" },
                            createdAt: { type: "string", format: "date-time" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Sessions"],
          summary: "Revoke all other sessions",
          operationId: "revokeAllSessions",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Sessions revoked" } },
        },
      },

      "/api/v1/sessions/{id}": {
        delete: {
          tags: ["Sessions"],
          summary: "Revoke a session",
          operationId: "revokeSession",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Session revoked" } },
        },
      },

      "/api/v1/settings": {
        get: {
          tags: ["Settings"],
          summary: "Get settings and branding",
          operationId: "getSettings",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Settings and branding" } },
        },
      },

      "/api/v1/settings/branding": {
        put: {
          tags: ["Settings"],
          summary: "Update branding",
          operationId: "updateBranding",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    logo: { type: "string" },
                    brandColor: { type: "string" },
                    font: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Branding updated" } },
        },
      },

      "/api/v1/settings/settings": {
        put: {
          tags: ["Settings"],
          summary: "Update settings",
          operationId: "updateSettings",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    currency: { type: "string" },
                    dateFormat: { type: "string" },
                    language: { type: "string" },
                    numberFormat: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Settings updated" } },
        },
      },

      "/api/v1/settings/fees": {
        put: {
          tags: ["Settings"],
          summary: "Update fee configuration (settings)",
          operationId: "updateFeeSettings",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Fee settings updated" } },
        },
      },

      "/api/v1/settings/checkout": {
        put: {
          tags: ["Settings"],
          summary: "Update checkout configuration",
          operationId: "updateCheckoutConfig",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Checkout config updated" } },
        },
      },

      "/api/v1/settings/customer-notifications": {
        put: {
          tags: ["Settings"],
          summary: "Update customer notification settings",
          operationId: "updateCustomerNotifications",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Notification settings updated" } },
        },
      },

      "/api/v1/merchants/lifecycle/profile": {
        get: {
          tags: ["Merchant Lifecycle"],
          summary: "Get full merchant profile",
          operationId: "getLifecycleProfile",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Full merchant profile" } },
        },
      },

      "/api/v1/merchants/lifecycle/business-profile": {
        get: {
          tags: ["Merchant Lifecycle"],
          summary: "Get business profile",
          operationId: "getBusinessProfile",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Business profile" } },
        },
        put: {
          tags: ["Merchant Lifecycle"],
          summary: "Update business profile",
          operationId: "updateBusinessProfile",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mccCode: { type: "string" },
                    expectedMonthlyVolume: { type: "number" },
                    averageTicketSize: { type: "number" },
                    websiteUrl: { type: "string", format: "uri" },
                    refundPolicyUrl: { type: "string", format: "uri" },
                    termsUrl: { type: "string", format: "uri" },
                    businessDescription: { type: "string" },
                    incorporationDate: { type: "string", format: "date" },
                    taxId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Business profile updated" } },
        },
      },

      "/api/v1/merchants/lifecycle/approval-history": {
        get: {
          tags: ["Merchant Lifecycle"],
          summary: "Get approval history",
          operationId: "getApprovalHistory",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Approval history" } },
        },
      },

      "/api/v1/merchants/lifecycle/compliance-notes": {
        get: {
          tags: ["Merchant Lifecycle"],
          summary: "List compliance notes",
          operationId: "listComplianceNotes",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Compliance notes" } },
        },
        post: {
          tags: ["Merchant Lifecycle"],
          summary: "Create compliance note",
          operationId: "createComplianceNote",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["content"],
                  properties: {
                    content: { type: "string" },
                    category: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Compliance note created" } },
        },
      },

      "/api/v1/merchants/lifecycle/onboarding-status": {
        get: {
          tags: ["Merchant Lifecycle"],
          summary: "Get onboarding status",
          operationId: "getOnboardingStatus",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Onboarding progress" } },
        },
      },

      "/api/v1/analytics/revenue": {
        get: {
          tags: ["Analytics"],
          summary: "Get revenue analytics",
          operationId: "getRevenueAnalytics",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "period", in: "query", schema: { type: "string", enum: ["daily", "weekly", "monthly"] } },
            { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
            { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
          ],
          responses: { "200": { description: "Revenue data" } },
        },
      },

      "/api/v1/analytics/funnel": {
        get: {
          tags: ["Analytics"],
          summary: "Get payment funnel",
          operationId: "getPaymentFunnel",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Payment funnel stages" } },
        },
      },

      "/api/v1/analytics/{metric}": {
        get: {
          tags: ["Analytics"],
          summary: "Get analytics metric",
          operationId: "getAnalyticsMetric",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "metric", in: "path", required: true, schema: { type: "string", enum: ["latency", "failure-reasons", "retry-analytics", "chargeback-rate", "geo", "devices", "cohorts", "mrr"] } },
          ],
          responses: { "200": { description: "Analytics data" } },
        },
      },

      "/api/v1/fraud-rules": {
        get: {
          tags: ["Fraud"],
          summary: "List active fraud rules",
          operationId: "listFraudRules",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Fraud rules" } },
        },
      },

      "/api/v1/uploads": {
        post: {
          tags: ["Uploads"],
          summary: "Upload a file",
          operationId: "uploadFile",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["fileName", "fileType", "fileSize", "fileData", "category"],
                  properties: {
                    fileName: { type: "string" },
                    fileType: { type: "string", enum: ["pdf", "jpg", "png", "doc", "docx", "xls", "xlsx"] },
                    fileSize: { type: "integer", description: "Max 10MB" },
                    fileData: { type: "string", description: "Base64-encoded file data" },
                    category: { type: "string", example: "KYC" },
                    refId: { type: "string" },
                    refType: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "File uploaded" } },
        },
      },

      "/api/v1/uploads/{id}": {
        get: {
          tags: ["Uploads"],
          summary: "Get upload metadata",
          operationId: "getUpload",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Upload metadata" } },
        },
        delete: {
          tags: ["Uploads"],
          summary: "Delete an upload",
          operationId: "deleteUpload",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "File deleted" } },
        },
      },

      "/api/v1/uploads/{id}/download": {
        get: {
          tags: ["Uploads"],
          summary: "Download file",
          operationId: "downloadUpload",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "File binary" } },
        },
      },

      "/api/v1/billing/plan": {
        get: {
          tags: ["Billing"],
          summary: "Get current plan & available plans",
          operationId: "getBillingPlan",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Plan info" } },
        },
      },

      "/api/v1/billing/subscribe": {
        post: {
          tags: ["Billing"],
          summary: "Subscribe to a plan",
          operationId: "subscribePlan",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["planId"],
                  properties: { planId: { type: "string", format: "uuid" } },
                },
              },
            },
          },
          responses: { "200": { description: "Subscribed" } },
        },
      },

      "/api/v1/billing/cancel": {
        post: {
          tags: ["Billing"],
          summary: "Cancel subscription",
          operationId: "cancelSubscription",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Subscription cancelled" } },
        },
      },

      "/api/v1/billing/fee-schedule": {
        get: {
          tags: ["Billing"],
          summary: "Get fee schedule",
          operationId: "getFeeSchedule",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Fee schedule" } },
        },
        patch: {
          tags: ["Billing"],
          summary: "Update fee schedule",
          operationId: "updateFeeSchedule",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mdr: { type: "number" },
                    fixedFee: { type: "number" },
                    internationalMarkup: { type: "number" },
                    payoutFee: { type: "number" },
                    refundFee: { type: "number" },
                    chargebackFee: { type: "number" },
                    upiMdr: { type: "number" },
                    upiFixedFee: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Fee schedule updated" } },
        },
      },

      "/api/v1/billing/invoices": {
        get: {
          tags: ["Billing"],
          summary: "List billing invoices",
          operationId: "listBillingInvoices",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Billing invoices" } },
        },
      },

      "/api/v1/payment-methods": {
        get: {
          tags: ["Payment Methods"],
          summary: "List configured payment methods",
          operationId: "listPaymentMethods",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Payment methods" } },
        },
      },

      "/api/v1/payment-methods/{id}": {
        put: {
          tags: ["Payment Methods"],
          summary: "Update payment method config",
          operationId: "updatePaymentMethod",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    config: { type: "object" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Payment method updated" } },
        },
      },

      "/api/v1/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "List notification preferences",
          operationId: "listNotificationPreferences",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Notification preferences" } },
        },
        put: {
          tags: ["Notifications"],
          summary: "Update notification preferences",
          operationId: "updateNotificationPreferences",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["preferences"],
                  properties: {
                    preferences: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          channel: { type: "string", enum: ["email", "sms", "webhook"] },
                          event: { type: "string" },
                          enabled: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Preferences updated" } },
        },
      },

      "/api/v1/notifications/slack": {
        put: {
          tags: ["Notifications"],
          summary: "Configure Slack integration",
          operationId: "configureSlackNotifications",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["webhookUrl"],
                  properties: {
                    webhookUrl: { type: "string", format: "uri" },
                    channel: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Slack configured" } },
        },
        delete: {
          tags: ["Notifications"],
          summary: "Disconnect Slack",
          operationId: "disconnectSlack",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Slack disconnected" } },
        },
      },

      "/api/v1/compliance/status": {
        get: {
          tags: ["Compliance"],
          summary: "Get compliance status",
          operationId: "getComplianceStatus",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Compliance status" } },
        },
      },

      "/api/v1/compliance/reports": {
        get: {
          tags: ["Compliance"],
          summary: "List compliance reports",
          operationId: "listComplianceReports",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Compliance reports" } },
        },
      },

      "/api/v1/compliance/reports/{id}/download": {
        get: {
          tags: ["Compliance"],
          summary: "Download compliance report",
          operationId: "downloadComplianceReport",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "CSV file" } },
        },
      },

      "/api/v1/compliance/gdpr/export": {
        post: {
          tags: ["Compliance"],
          summary: "Export personal data (GDPR)",
          operationId: "gdprExport",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Personal data export" } },
        },
      },

      "/api/v1/compliance/gdpr/erase": {
        post: {
          tags: ["Compliance"],
          summary: "Erase personal data (GDPR)",
          operationId: "gdprErase",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Personal data anonymized" } },
        },
      },

      "/api/v1/marketplace/dashboard": {
        get: {
          tags: ["Marketplace"],
          summary: "Get marketplace dashboard",
          operationId: "getMarketplaceDashboard",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Marketplace summary" } },
        },
      },

      "/api/v1/marketplace/sub-merchants": {
        get: {
          tags: ["Marketplace"],
          summary: "List sub-merchants",
          operationId: "listSubMerchants",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: {
            "200": {
              description: "Sub-merchant list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/SubMerchant" } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Marketplace"],
          summary: "Create sub-merchant",
          operationId: "createSubMerchant",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "commissionPct"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    commissionPct: { type: "number", minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Sub-merchant created" } },
        },
      },

      "/api/v1/marketplace/sub-merchants/{id}": {
        patch: {
          tags: ["Marketplace"],
          summary: "Update sub-merchant",
          operationId: "updateSubMerchant",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    commissionPct: { type: "number" },
                    status: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Sub-merchant updated" } },
        },
      },

      "/api/v1/marketplace/split-rules": {
        get: {
          tags: ["Marketplace"],
          summary: "List split rules",
          operationId: "listSplitRules",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Split rules" } },
        },
        post: {
          tags: ["Marketplace"],
          summary: "Create split rule",
          operationId: "createSplitRule",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["subMerchantId", "percentage"],
                  properties: {
                    subMerchantId: { type: "string", format: "uuid" },
                    percentage: { type: "number", minimum: 1, maximum: 100 },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Split rule created" } },
        },
      },

      "/api/v1/marketplace/split-rules/{id}": {
        delete: {
          tags: ["Marketplace"],
          summary: "Delete split rule",
          operationId: "deleteSplitRule",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Split rule deleted" } },
        },
      },

      "/api/v1/integrations": {
        get: {
          tags: ["Integrations"],
          summary: "List available integrations",
          operationId: "listIntegrations",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Integration catalog" } },
        },
      },

      "/api/v1/integrations/{id}/connect": {
        post: {
          tags: ["Integrations"],
          summary: "Connect integration",
          operationId: "connectIntegration",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    apiKey: { type: "string" },
                    apiSecret: { type: "string" },
                    config: { type: "object" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Integration connected" } },
        },
      },

      "/api/v1/integrations/{id}/disconnect": {
        post: {
          tags: ["Integrations"],
          summary: "Disconnect integration",
          operationId: "disconnectIntegration",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Integration disconnected" } },
        },
      },

      "/api/v1/sandbox/events": {
        post: {
          tags: ["Sandbox"],
          summary: "Simulate an event",
          description: "Trigger a simulated event in the sandbox environment (dispute, chargeback, payout failure).",
          operationId: "simulateSandboxEvent",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["event"],
                  properties: {
                    event: { type: "string", enum: ["dispute_raised", "chargeback", "payout_failure"] },
                    paymentId: { type: "string", format: "uuid" },
                    amount: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Event simulated" } },
        },
      },

      "/api/v1/sandbox/reset": {
        delete: {
          tags: ["Sandbox"],
          summary: "Reset sandbox",
          description: "Delete all sandbox data for the merchant.",
          operationId: "resetSandbox",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Sandbox reset" } },
        },
      },

      "/api/v1/support/tickets": {
        get: {
          tags: ["Support"],
          summary: "List support tickets",
          operationId: "listSupportTickets",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "priority", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Support tickets",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/SupportTicket" } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Support"],
          summary: "Create support ticket",
          operationId: "createSupportTicket",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["subject", "message"],
                  properties: {
                    subject: { type: "string" },
                    category: { type: "string" },
                    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Ticket created" } },
        },
      },

      "/api/v1/support/tickets/{id}": {
        get: {
          tags: ["Support"],
          summary: "Get support ticket",
          operationId: "getSupportTicket",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Ticket details" } },
        },
      },

      "/api/v1/support/tickets/{id}/messages": {
        post: {
          tags: ["Support"],
          summary: "Add message to ticket",
          operationId: "addTicketMessage",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["content"],
                  properties: { content: { type: "string" } },
                },
              },
            },
          },
          responses: { "201": { description: "Message added" } },
        },
      },

      "/api/v1/support/tickets/{id}/close": {
        post: {
          tags: ["Support"],
          summary: "Close support ticket",
          operationId: "closeSupportTicket",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Ticket closed" } },
        },
      },

      "/api/v1/support/canned-responses": {
        get: {
          tags: ["Support"],
          summary: "List canned responses",
          operationId: "listCannedResponses",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Canned responses" } },
        },
        post: {
          tags: ["Support"],
          summary: "Create canned response",
          operationId: "createCannedResponse",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "content"],
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    category: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Canned response created" } },
        },
      },

      "/api/v1/support/canned-responses/{id}": {
        delete: {
          tags: ["Support"],
          summary: "Delete canned response",
          operationId: "deleteCannedResponse",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Canned response deactivated" } },
        },
      },

      "/api/v1/reserve/config": {
        get: {
          tags: ["Reserve"],
          summary: "Get reserve configuration",
          operationId: "getReserveConfig",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Reserve config" } },
        },
        patch: {
          tags: ["Reserve"],
          summary: "Update reserve configuration",
          operationId: "updateReserveConfig",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reservePercentage: { type: "number" },
                    fixedReserveAmount: { type: "number" },
                    releaseDelayDays: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Config updated" } },
        },
      },

      "/api/v1/reserve/hold": {
        post: {
          tags: ["Reserve"],
          summary: "Place manual reserve hold",
          operationId: "createReserveHold",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount", "reason"],
                  properties: {
                    amount: { type: "number" },
                    reason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Hold placed" } },
        },
      },

      "/api/v1/reserve/release": {
        post: {
          tags: ["Reserve"],
          summary: "Schedule reserve release",
          operationId: "scheduleReserveRelease",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "201": { description: "Release scheduled" } },
        },
      },

      "/api/v1/reconciliation/runs": {
        get: {
          tags: ["Reconciliation"],
          summary: "List reconciliation runs",
          operationId: "listReconciliationRuns",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Reconciliation runs" } },
        },
      },

      "/api/v1/reconciliation/runs/{id}": {
        get: {
          tags: ["Reconciliation"],
          summary: "Get reconciliation run",
          operationId: "getReconciliationRun",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Run details" } },
        },
      },

      "/api/v1/reconciliation/matches": {
        get: {
          tags: ["Reconciliation"],
          summary: "List reconciliation matches",
          operationId: "listReconciliationMatches",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "runId", in: "query", schema: { type: "string" } },
            { name: "matchType", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "offset", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Matches" } },
        },
      },

      "/api/v1/reconciliation/matches/{id}/resolve": {
        patch: {
          tags: ["Reconciliation"],
          summary: "Resolve a reconciliation match",
          operationId: "resolveReconciliationMatch",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["resolution"],
                  properties: { resolution: { type: "string" } },
                },
              },
            },
          },
          responses: { "200": { description: "Match resolved" } },
        },
      },

      "/api/v1/reconciliation/rules": {
        get: {
          tags: ["Reconciliation"],
          summary: "List reconciliation rules",
          operationId: "listReconciliationRules",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Rules" } },
        },
      },

      "/api/v1/reconciliation/settlement-batches": {
        get: {
          tags: ["Reconciliation"],
          summary: "List settlement batches",
          operationId: "listSettlementBatches",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Batches" } },
        },
      },

      "/api/v1/reconciliation/settlement-batches/{id}": {
        get: {
          tags: ["Reconciliation"],
          summary: "Get settlement batch",
          operationId: "getSettlementBatch",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Batch details" } },
        },
      },

      "/api/v1/reconciliation/summary": {
        get: {
          tags: ["Reconciliation"],
          summary: "Get reconciliation summary",
          operationId: "getReconciliationSummary",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Summary" } },
        },
      },

      "/api/v1/security/events": {
        get: {
          tags: ["Security"],
          summary: "List security events",
          operationId: "listSecurityEvents",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Security events" } },
        },
      },

      "/api/v1/security/sessions": {
        get: {
          tags: ["Security"],
          summary: "List merchant sessions",
          operationId: "listMerchantSessions",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Sessions" } },
        },
      },

      "/api/v1/gl/accounts": {
        get: {
          tags: ["General Ledger"],
          summary: "List chart of accounts",
          operationId: "listChartAccounts",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Chart accounts" } },
        },
      },

      "/api/v1/gl/accounts/{code}": {
        get: {
          tags: ["General Ledger"],
          summary: "Get account details",
          operationId: "getChartAccount",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Account details with balance" } },
        },
      },

      "/api/v1/gl/journal": {
        get: {
          tags: ["General Ledger"],
          summary: "List journal entries",
          operationId: "listJournalEntries",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "transactionType", in: "query", schema: { type: "string" } },
            { name: "transactionId", in: "query", schema: { type: "string" } },
            { name: "accountCode", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "offset", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Journal entries" } },
        },
        post: {
          tags: ["General Ledger"],
          summary: "Create journal entry",
          operationId: "createJournalEntry",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["lines"],
                  properties: {
                    transactionId: { type: "string" },
                    transactionType: { type: "string" },
                    description: { type: "string" },
                    reference: { type: "string" },
                    lines: {
                      type: "array",
                      minItems: 2,
                      items: {
                        type: "object",
                        properties: {
                          accountCode: { type: "string" },
                          debit: { type: "number" },
                          credit: { type: "number" },
                          description: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Journal entry created" } },
        },
      },

      "/api/v1/gl/journal/{id}": {
        get: {
          tags: ["General Ledger"],
          summary: "Get journal entry",
          operationId: "getJournalEntry",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Journal entry" } },
        },
      },

      "/api/v1/gl/journal/{id}/reverse": {
        post: {
          tags: ["General Ledger"],
          summary: "Reverse journal entry",
          operationId: "reverseJournalEntry",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["reason"],
                  properties: { reason: { type: "string" } },
                },
              },
            },
          },
          responses: { "201": { description: "Entry reversed" } },
        },
      },

      "/api/v1/gl/trial-balance": {
        get: {
          tags: ["General Ledger"],
          summary: "Get trial balance",
          operationId: "getTrialBalance",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "asOf", in: "query", schema: { type: "string", format: "date" } }],
          responses: { "200": { description: "Trial balance" } },
        },
      },

      "/api/v1/gl/income-statement": {
        get: {
          tags: ["General Ledger"],
          summary: "Get income statement",
          operationId: "getIncomeStatement",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "from", in: "query", required: true, schema: { type: "string", format: "date" } },
            { name: "to", in: "query", required: true, schema: { type: "string", format: "date" } },
          ],
          responses: { "200": { description: "Income statement" } },
        },
      },

      "/api/v1/gl/transactions/{type}/{id}": {
        get: {
          tags: ["General Ledger"],
          summary: "Get transaction ledger entries",
          operationId: "getTransactionLedger",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [
            { name: "type", in: "path", required: true, schema: { type: "string" } },
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Transaction ledger" } },
        },
      },

      "/api/v1/marketplace-deep/sub-merchants/{id}/kyc": {
        patch: {
          tags: ["Marketplace (Deep)"],
          summary: "Update sub-merchant KYC",
          operationId: "updateSubMerchantKyc",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    kycStatus: { type: "string" },
                    riskCategory: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "KYC updated" } },
        },
      },

      "/api/v1/marketplace-deep/split-transactions": {
        get: {
          tags: ["Marketplace (Deep)"],
          summary: "List split transactions",
          operationId: "listSplitTransactions",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Split transactions" } },
        },
      },

      "/api/v1/reconciliation-deep/runs": {
        get: {
          tags: ["Reconciliation (Deep)"],
          summary: "List deep reconciliation runs",
          operationId: "listDeepReconciliationRuns",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Deep reconciliation runs" } },
        },
      },

      "/api/v1/reconciliation-deep/daily-balances": {
        get: {
          tags: ["Reconciliation (Deep)"],
          summary: "Get daily balances",
          operationId: "getDailyBalances",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          parameters: [{ name: "days", in: "query", schema: { type: "integer" } }],
          responses: { "200": { description: "Daily balances" } },
        },
      },

      "/api/v1/reconciliation-deep/unreconciled": {
        get: {
          tags: ["Reconciliation (Deep)"],
          summary: "Get unreconciled adjustments",
          operationId: "getUnreconciledAdjustments",
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { "200": { description: "Unreconciled adjustments" } },
        },
      },

      "/api/v1/incidents": {
        get: {
          tags: ["Incidents"],
          summary: "List incidents",
          operationId: "listIncidents",
          responses: {
            "200": {
              description: "Incident list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Incident" } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Incidents"],
          summary: "Create incident",
          operationId: "createIncident",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    severity: { type: "string", enum: ["SEV1", "SEV2", "SEV3"] },
                    affectedServices: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Incident created" } },
        },
      },

      "/api/v1/incidents/active": {
        get: {
          tags: ["Incidents"],
          summary: "List active incidents",
          operationId: "listActiveIncidents",
          responses: {
            "200": {
              description: "Active incidents",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Incident" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/incidents/{id}/status": {
        patch: {
          tags: ["Incidents"],
          summary: "Update incident status",
          operationId: "updateIncidentStatus",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Status updated" } },
        },
      },

      "/api/v1/incidents/{id}/updates": {
        post: {
          tags: ["Incidents"],
          summary: "Add incident update",
          operationId: "addIncidentUpdate",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          responses: { "201": { description: "Update added" } },
        },
      },

      "/api/v1/incidents/{id}/postmortem": {
        post: {
          tags: ["Incidents"],
          summary: "Submit incident postmortem",
          operationId: "submitIncidentPostmortem",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rootCause: { type: "string" },
                    impact: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Postmortem submitted" } },
        },
      },

      "/api/v1/status": {
        get: {
          tags: ["Status Page"],
          summary: "Get system status",
          operationId: "getSystemStatus",
          responses: {
            "200": {
              description: "Current system status",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      message: { type: "string" },
                      lastChecked: { type: "string", format: "date-time" },
                      components: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            status: { type: "string" },
                            uptime: { type: "number" },
                            description: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/v1/status/components": {
        get: {
          tags: ["Status Page"],
          summary: "List status components",
          operationId: "listStatusComponents",
          responses: { "200": { description: "Components" } },
        },
      },

      "/api/v1/status/incidents": {
        get: {
          tags: ["Status Page"],
          summary: "List public incidents",
          operationId: "listPublicIncidents",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Incidents with pagination" } },
        },
      },

      "/api/v1/status/incidents/{id}": {
        get: {
          tags: ["Status Page"],
          summary: "Get incident details",
          operationId: "getPublicIncident",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Incident details" } },
        },
      },

      "/api/v1/status/uptime": {
        get: {
          tags: ["Status Page"],
          summary: "Get uptime history",
          operationId: "getUptimeHistory",
          parameters: [{ name: "period", in: "query", schema: { type: "string" } }],
          responses: { "200": { description: "Uptime history" } },
        },
      },

      "/api/v1/status/history": {
        get: {
          tags: ["Status Page"],
          summary: "Get past incident history",
          operationId: "getIncidentHistory",
          responses: { "200": { description: "Resolved incidents" } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token obtained from login or register. Use: `Authorization: Bearer <token>`",
        },
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key for programmatic access. Use: `x-api-key: nex_live_<key>` or `x-api-key: nex_test_<key>`",
        },
      },
      schemas: {
        Merchant: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            country: { type: "string" },
            businessType: { type: "string" },
            kycStatus: { type: "string", enum: ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"] },
            status: { type: "string", enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "ACTIVE", "REJECTED", "SUSPENDED", "TERMINATED", "CLOSED"] },
            baseCurrency: { type: "string" },
            emailVerified: { type: "boolean" },
            totpEnabled: { type: "boolean" },
            smsMfaEnabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ApiKey: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            prefix: { type: "string" },
            env: { type: "string", enum: ["LIVE", "TEST"] },
            scopes: { type: "array", items: { type: "string" } },
            createdAt: { type: "string", format: "date-time" },
            revokedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["INITIATED", "PROCESSING", "AUTHORIZED", "CAPTURED", "SETTLED", "FAILED", "REFUNDED", "DISPUTED"] },
            amount: { type: "number" },
            currency: { type: "string" },
            amountRefunded: { type: "number" },
            paymentMethod: { type: "object" },
            description: { type: "string" },
            metadata: { type: "object" },
            customerId: { type: "string", format: "uuid", nullable: true },
            fraudScore: { type: "number", nullable: true },
            capturedAt: { type: "string", format: "date-time", nullable: true },
            settledAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Refund: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            paymentId: { type: "string", format: "uuid" },
            amount: { type: "number" },
            reason: { type: "string" },
            status: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Customer: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            phone: { type: "string" },
            metadata: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Payout: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            amount: { type: "number" },
            currency: { type: "string" },
            status: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"] },
            scheduledFor: { type: "string", format: "date-time", nullable: true },
            bankRef: { type: "string" },
            completedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Dispute: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            paymentId: { type: "string", format: "uuid" },
            reason: { type: "string" },
            status: { type: "string", enum: ["RAISED", "EVIDENCE_SUBMITTED", "UNDER_REVIEW", "RESOLVED_MERCHANT_WON", "RESOLVED_MERCHANT_LOST"] },
            amount: { type: "number" },
            evidence: { type: "object", nullable: true },
            resolution: { type: "string", nullable: true },
            resolvedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        WebhookEndpoint: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            url: { type: "string", format: "uri" },
            events: { type: "array", items: { type: "string" } },
            secret: { type: "string", description: "Only returned on creation" },
            enabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        WebhookDelivery: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            endpointId: { type: "string", format: "uuid" },
            paymentId: { type: "string", format: "uuid" },
            payload: { type: "object" },
            status: { type: "string", enum: ["PENDING", "DELIVERED", "FAILED", "DEAD_LETTER"] },
            attempts: { type: "integer" },
            nextRetryAt: { type: "string", format: "date-time", nullable: true },
            deliveredAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        BankAccount: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            accountNumber: { type: "string" },
            ifsc: { type: "string" },
            bankName: { type: "string" },
            accountHolder: { type: "string" },
            isPrimary: { type: "boolean" },
            verified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Invoice: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            invoiceNumber: { type: "string" },
            customerName: { type: "string" },
            customerEmail: { type: "string" },
            customerGstin: { type: "string" },
            status: { type: "string", enum: ["DRAFT", "SENT", "PAID", "CANCELLED"] },
            subtotal: { type: "number" },
            taxAmount: { type: "number" },
            total: { type: "number" },
            currency: { type: "string" },
            dueDate: { type: "string", format: "date", nullable: true },
            issuedDate: { type: "string", format: "date-time", nullable: true },
            paidAt: { type: "string", format: "date-time", nullable: true },
            notes: { type: "string" },
            lineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unitPrice: { type: "number" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        TeamMember: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["OWNER", "ADMIN", "DEVELOPER", "FINANCE", "READ_ONLY"] },
            status: { type: "string" },
            invitedAt: { type: "string", format: "date-time", nullable: true },
            lastLoginAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        Account: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            merchantId: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["ASSET", "LIABILITY", "REVENUE", "EXPENSE", "EQUITY"] },
            currency: { type: "string" },
            name: { type: "string" },
            lastBalance: { type: "number" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        LedgerEntry: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            accountId: { type: "string", format: "uuid" },
            paymentId: { type: "string", format: "uuid", nullable: true },
            type: { type: "string", enum: ["DEBIT", "CREDIT"] },
            amount: { type: "number" },
            currency: { type: "string" },
            balanceAfter: { type: "number" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        FraudRule: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            condition: { type: "object" },
            action: { type: "string" },
            scoreWeight: { type: "number" },
            enabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        SubMerchant: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            commissionPct: { type: "number" },
            status: { type: "string" },
            gmv: { type: "number" },
            apiKeyPrefix: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        SupportTicket: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            subject: { type: "string" },
            category: { type: "string" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
            status: { type: "string", enum: ["OPEN", "PENDING_MERCHANT", "PENDING_INTERNAL", "RESOLVED", "CLOSED"] },
            assignedTo: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Incident: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            severity: { type: "string", enum: ["SEV1", "SEV2", "SEV3"] },
            status: { type: "string", enum: ["DETECTED", "INVESTIGATING", "MITIGATING", "RESOLVED", "POSTMORTEM", "CLOSED"] },
            affectedServices: { type: "array", items: { type: "string" } },
            rootCause: { type: "string" },
            impact: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            resolvedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing or invalid authentication",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string", example: "not_found" },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string", example: "server_error" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "Service health endpoints" },
      { name: "Authentication", description: "Merchant authentication (no auth required)" },
      { name: "Merchant Settings", description: "MFA and merchant account settings (auth required)" },
      { name: "Merchant Profile", description: "Merchant profile management" },
      { name: "API Keys", description: "API key management" },
      { name: "Webhooks", description: "Webhook endpoint and delivery management" },
      { name: "Payments", description: "Payment charge operations" },
      { name: "Customers", description: "Customer management" },
      { name: "Disputes", description: "Dispute handling" },
      { name: "Payouts", description: "Payout operations" },
      { name: "Wallets", description: "Wallet balance and transactions" },
      { name: "Bank Accounts", description: "Bank account management" },
      { name: "Invoices", description: "Invoice generation and management" },
      { name: "Team", description: "Team member management" },
      { name: "Sessions", description: "Session management" },
      { name: "Settings", description: "Merchant settings and branding" },
      { name: "Merchant Lifecycle", description: "Onboarding, KYC, and compliance" },
      { name: "Analytics", description: "Revenue and performance analytics" },
      { name: "Fraud", description: "Fraud rule management" },
      { name: "Uploads", description: "File upload management" },
      { name: "Billing", description: "Subscription and fee schedule management" },
      { name: "Payment Methods", description: "Configured payment methods" },
      { name: "Notifications", description: "Notification preferences and Slack integration" },
      { name: "Compliance", description: "Compliance, GDPR, and reporting" },
      { name: "Marketplace", description: "Sub-merchant and split payment management" },
      { name: "Integrations", description: "Third-party integrations" },
      { name: "Sandbox", description: "Sandbox testing utilities" },
      { name: "Support", description: "Support ticket management" },
      { name: "Reserve", description: "Reserve fund management" },
      { name: "Reconciliation", description: "Reconciliation runs, matches, and settlement batches" },
      { name: "Security", description: "Security events and session monitoring" },
      { name: "General Ledger", description: "Double-entry accounting and journal entries" },
      { name: "Marketplace (Deep)", description: "Advanced marketplace operations" },
      { name: "Reconciliation (Deep)", description: "Advanced reconciliation operations" },
      { name: "Incidents", description: "Incident management" },
      { name: "Status Page", description: "Public system status endpoints" },
    ],
  };
}
