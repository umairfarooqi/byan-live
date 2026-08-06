# Live Pulse Audio

Build a React (Vite) live audio broadcast web app with two routes, using LiveKit for real-time audio streaming. No backend server, no .env files, all configuration hardcoded as plain constants directly in the source code.

Design: Clean white background, centered layout. A large circular waveform visualizer made of many thin vertical bars arranged in a ring, coral/pink gradient (#F0636B to #F5A0A5), animated pulsing while live, static/dimmed while offline. Below the circle, a session title in large bold dark navy text, centered. Below that, a single circular outlined coral play/pause button with a solid triangle icon that switches to a pause icon when playing. No extra icons, no dots menu, no subtitles, no chevrons, just: waveform circle, title, play button, small status indicator (pulsing red dot when live, gray dot when offline).

Public listener page (/): No login, signup, or account required, ever. On load, generate a LiveKit access token client-side and join a fixed room named "main-broadcast" as subscriber-only. Poll or subscribe for room state every few seconds. Title text is not hardcoded, it displays whatever the admin has set (shared via room metadata or LiveKit data channel), defaulting to "Live Session" when nothing is set, and "Not live yet" when offline. Waveform animates in sync with incoming audio amplitude if feasible, otherwise a smooth looping pulse as fallback. Add the Media Session API (proper title metadata, play/pause handlers) and the Wake Lock API (re-requested on visibility change) to improve background playback behavior, while noting in a code comment that iOS Safari may still suspend playback when the tab is backgrounded, this is a browser-level limitation with no full JS fix.

Admin page (/admin): Not linked publicly, protected by a password screen, correct password admin90 hardcoded as a plain constant. After login: a text input for the session title (this is the single source of truth for the title shown to listeners), a "Go Live" button that requests mic permission and publishes the admin's audio as a publisher to "main-broadcast", and an "End Live Session" button that disconnects and stops the broadcast for everyone. Add the Wake Lock API here too. Add a clearly visible warning banner on this page: "Keep this browser tab open and on-screen the entire time you're broadcasting. Switching apps or letting the screen lock will cut the stream. Keep your phone plugged in and Do Not Disturb on."

LiveKit credentials (hardcoded constants, no .env):

LIVEKIT_URL = "wss://live-itzo8iwa.livekit.cloud"
LIVEKIT_API_KEY = "APIbVyymX2Ad8Ti"
LIVEKIT_API_SECRET = "nadaRzy2UWr3fEc390eBydynp2LaKRo28g9b64SxHim"

Deployment: Set Vite's base config to /live-byan/ for GitHub Pages compatibility. Add a GitHub Actions workflow at .github/workflows/deploy.yml that builds the project and deploys the dist folder to GitHub Pages automatically on every push to main.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://byan-live.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2f6ce250-dc43-4206-8541-01124056e728).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
