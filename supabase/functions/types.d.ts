// Type declarations for Supabase Edge Functions (Deno runtime)
// This file allows TypeScript language tooling in IDEs to resolve Deno globals
// and npm: specifiers when the Deno language server is not active.

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined
  }
  export const env: Env
  export function serve(
    handler: (request: Request) => Promise<Response> | Response
  ): void
}
