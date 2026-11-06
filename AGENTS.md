# Project rules
- Chat selection follows the URL; explicit chat actions navigate rather than synchronizing two competing routing effects, so refresh and browser history remain stable.
- Conversation loading errors are separate from missing conversations, so connection failures do not appear as deleted chats.
- Chat uses one selected configured key and one bounded provider request for both coding and everyday replies; no rewrite, tool-picker, embedding gateway, or alternate-provider retry may bypass that boundary.
- Save user messages before requesting replies; transient failure messages never enter saved history or subsequent AI context, and overlapping sends are blocked to avoid duplicate messages.- React/Tailwind/Vite expert guidance lives in supabase/functions/_shared/reactStack.ts with a browser copy in src/lib/reactStackExpert.ts; edit both together so every builder and coding AI shares one standard.
- The page builder's AI endpoint (llama-chat) uses the same shared single-key provider client as chat (supabase/functions/_shared/provider.ts): one bounded request, no alternate model or provider retry.

- Builder sections and semantic page styles share one renderer for editing, standalone HTML, and Vite exports so downloaded pages match the preview.
- App Builder stages use the shared configured-provider client once per stage, never automatic retries or workspace-credit fallbacks, so failures cannot silently change the connection.
- App Builder single-file recovery lives in build-app/recoverSingleFile.ts so malformed provider wrappers can be tested without executing the edge function.
