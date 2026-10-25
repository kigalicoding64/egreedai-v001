CREATE TABLE public.chat_provider_access_state (
  provider text PRIMARY KEY CHECK (provider IN ('gemini', 'openai')),
  denied boolean NOT NULL DEFAULT false,
  reason text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.chat_provider_access_state TO service_role;
REVOKE ALL ON public.chat_provider_access_state FROM anon, authenticated;
ALTER TABLE public.chat_provider_access_state ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.chat_provider_access_state IS 'Server-only provider denial circuit breaker. Clear only after access is restored and the owner explicitly requests resumption.';