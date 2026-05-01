declare module '@prisma/client' {
  export class PrismaClient {
    constructor(...args: any[])
    $connect(): Promise<void>
    $disconnect(): Promise<void>
    [key: string]: any
  }

  export const Prisma: any
  export type PrismaClientKnownRequestError = any
}
