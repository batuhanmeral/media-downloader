# Fetchy

A local-only web UI for downloading video (MP4/MKV) and audio (MP3/M4A) from any site [yt-dlp](https://github.com/yt-dlp/yt-dlp) supports. Paste a link, pick a format and quality, and the file is saved to a folder on your machine.

## Tech stack

| Area      | Tools                                         |
| --------- | --------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI        | Tailwind CSS v4, lucide-react                 |
| Server    | Server Actions, Server-Sent Events, zod       |
| Media     | yt-dlp, ffmpeg, Deno                          |
| Testing   | Vitest, Testing Library, Playwright           |
| Tooling   | pnpm, ESLint, Prettier                        |

## Features

- Works with every site yt-dlp supports
- Shows title, channel, duration, thumbnail and available resolutions before downloading
- Video: MP4 or MKV, up to 4320p
- Audio: MP3 (320/192/128 kbps) or M4A
- Playlists and channels (up to 300 videos): one format for all, downloaded one by one into a folder named after the playlist
- Embedded metadata and cover art
- Concurrent downloads with live progress and cancel
- Turkish and English UI, light and dark theme

## Getting started

Requires Node.js, pnpm, and `yt-dlp`, `ffmpeg` and `deno` on your `PATH`.

```sh
pnpm install
cp .env.example .env.local   # set DOWNLOAD_DIR to an existing, writable folder
pnpm dev                     # http://127.0.0.1:3000
```

For everyday use, run `pnpm build && pnpm start` instead.

Fetchy has no login and binds to `127.0.0.1`; don't expose it to a network.

## License

[MIT](LICENSE)
