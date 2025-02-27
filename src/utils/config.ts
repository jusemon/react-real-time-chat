import { z } from 'zod';

const schema = z
  .object({
    VITE_API_URL: z.string().url(),
    VITE_AVATARS_API_URL: z.string().url(),
  })
  .transform((env) => ({
    chathub: env.VITE_API_URL,
    avatars: env.VITE_AVATARS_API_URL,
  }));

const config = schema.parse(import.meta.env);

export type ServicesConfig = z.infer<typeof schema>;
export const servicesConfig: ServicesConfig = config;
