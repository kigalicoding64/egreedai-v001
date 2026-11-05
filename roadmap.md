# Chat navigation
- [ ] Finish builder section designs and share rendering between canvas, preview, and downloads.
- [ ] Verify builder preview and downloaded project on desktop and mobile.
- [x] Make chat addresses authoritative for refresh, home, and browser history.
- [x] Separate loading failures from missing chats and offer retry.
- [x] Test navigation and verify signed-in chat/error flows.

# AI replies
- [x] Remove hidden provider/workspace fallback and bound reply execution.
- [x] Test message saving, failed-reply exclusion, duplicate-send protection, and complete responses with controlled provider tests.
- [x] Verify signed-in live provider failure, saved message after refresh, and stable chat address.
- [ ] Verify a complete live AI reply. Blocked: configured Gemini access is denied and its persisted denial flag remains enabled; requires restored access and explicit permission to resume. OpenAI is not tried as a fallback. Configured model availability also needs checking once access is restored.