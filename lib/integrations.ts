import "server-only";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { env } from "@/lib/env";
import { decryptSecret } from "@/lib/security/crypto";
import type { IntegrationProvider } from "@/lib/generated/prisma/client";

/**
 * Provider settings entered by the owner under Settings → Integrations. Each provider declares
 * the shape of its public config and of its secrets; anything that does not parse counts as
 * "not configured" so a half-filled form can never be used to send a payment or a message.
 */
const shapes = {
  MSG91: {
    public: z.object({ senderId: z.string().min(1).optional() }),
    secret: z.object({ authKey: z.string().min(10), otpTemplateId: z.string().min(5) }),
  },
} satisfies Partial<Record<IntegrationProvider, { public: z.ZodType; secret: z.ZodType }>>;

type Shapes = typeof shapes;
type Provider = keyof Shapes;

export type IntegrationConfig<P extends Provider> = {
  isLive: boolean;
  publicConfig: z.infer<Shapes[P]["public"]>;
  secrets: z.infer<Shapes[P]["secret"]>;
};

export async function getIntegration<P extends Provider>(provider: P): Promise<IntegrationConfig<P> | null> {
  const row = await prisma.integration.findUnique({
    where: { storeId_provider: { storeId: DEFAULT_STORE_ID, provider } },
  });
  if (!row?.isEnabled || !row.secretCipher) return null;

  const shape = shapes[provider];
  const publicConfig = shape.public.safeParse(row.publicConfig ?? {});
  let secretJson: unknown;
  try {
    secretJson = JSON.parse(decryptSecret(row.secretCipher, env().APP_ENCRYPTION_KEY));
  } catch {
    console.error(`[integrations] could not decrypt ${provider} secrets; was APP_ENCRYPTION_KEY changed?`);
    return null;
  }
  const secrets = shape.secret.safeParse(secretJson);
  if (!publicConfig.success || !secrets.success) return null;

  return {
    isLive: row.isLive,
    publicConfig: publicConfig.data,
    secrets: secrets.data,
  } as IntegrationConfig<P>;
}
