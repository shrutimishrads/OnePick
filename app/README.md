# OnePick Fire TV Application

## Architecture
- **TV Frontend:** 10-foot television HTML5/TypeScript application (`app/index.html`) optimized for television viewports and 1080p canvas displays.
- **Fire OS Wrapper (`fireos/`):** Native Android Leanback Activity (`com.onepick.tv.MainActivity`) for deployment onto Fire TV hardware and Android TV emulators.
- **Remote Navigation:** Spatial D-pad focus engine mapping directional navigation (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`) to TV remote hardware buttons.
- **Server:** Node.js HTTP server (`app/server.ts`) serving the 10-foot frontend and exposing consensus calculation and Bedrock API endpoints.
