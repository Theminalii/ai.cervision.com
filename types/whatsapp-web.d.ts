declare module "whatsapp-web.js" {
  export class LocalAuth {
    constructor(options?: Record<string, unknown>)
  }

  export class Client {
    info?: {
      wid?: {
        _serialized?: string
      }
    }

    constructor(options?: Record<string, unknown>)
    on(event: string, listener: (...args: any[]) => void): void
    initialize(): Promise<void>
    destroy(): Promise<void>
    sendMessage(chatId: string, content: string): Promise<{
      id?: { _serialized?: string }
      timestamp?: number
    }>
  }
}
