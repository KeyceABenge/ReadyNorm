declare module 'npm:@supabase/supabase-js@2.49.4' {
  export * from '@supabase/supabase-js';
}

declare module 'npm:openai@4.52.0' {
  export { default } from 'openai';
  export * from 'openai';
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
