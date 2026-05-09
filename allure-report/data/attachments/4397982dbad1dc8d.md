# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessControlTests.spec.ts >> Access Control - Protected Routes >> Unauthenticated user >> Should redirect to login when accessing /admin without session
- Location: tests\e2e\accessControlTests.spec.ts:14:9

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\USUARIO\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```