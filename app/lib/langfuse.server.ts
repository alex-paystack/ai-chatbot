import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { resourceFromAttributes } from "@opentelemetry/resources";

const serviceName = process.env.LANGFUSE_SERVICE_NAME ?? "ai-chatbot-new";
const langfuseConfig = {
  baseUrl: process.env.LANGFUSE_BASEURL,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
};

declare global {
  // eslint-disable-next-line no-var -- needed to extend the Node global namespace
  var __langfuseSpanProcessor: LangfuseSpanProcessor | undefined;
  // eslint-disable-next-line no-var -- needed to extend the Node global namespace
  var __langfuseProviderRegistered: boolean | undefined;
}

const hasRequiredConfig =
  Boolean(langfuseConfig.baseUrl) &&
  Boolean(langfuseConfig.publicKey) &&
  Boolean(langfuseConfig.secretKey);

if (hasRequiredConfig && !globalThis.__langfuseProviderRegistered) {
  const processor = new LangfuseSpanProcessor({
    baseUrl: langfuseConfig.baseUrl!,
    publicKey: langfuseConfig.publicKey!,
    secretKey: langfuseConfig.secretKey!,
  });

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      "service.name": serviceName,
      environment: process.env.NODE_ENV ?? "development",
    }),
    spanProcessors: [processor],
  });

  provider.register();

  globalThis.__langfuseSpanProcessor = processor;
  globalThis.__langfuseProviderRegistered = true;
} else if (!hasRequiredConfig && process.env.NODE_ENV !== "production") {
  console.warn(
    "[langfuse] Missing LANGFUSE credentials – tracing will remain disabled."
  );
}

export const langfuseSpanProcessor = globalThis.__langfuseSpanProcessor;
