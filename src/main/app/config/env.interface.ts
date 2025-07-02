export interface Env {
  PORT: number
  EXPORTS_DIR: string
}

export interface CustomConfig {
  n8n: {
    webhookUrl: string
  }
}
