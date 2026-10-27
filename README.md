# PlayLiberty

PlayLiberty is a self-hosted audio player for a small private group. It copies the audio of a YouTube playlist into a store that the owner controls. A video removed from YouTube does not remove the track from the playlist.

![The PlayLiberty library: six playlists in a dark gallery, two pinned at the top](.github/assets/readme/01-library.webp)

## Why it exists

A YouTube playlist is a list of links. When a video goes away, the playlist loses the track. A downloaded file keeps one track, but it forgets the playlist and does not stay current.

PlayLiberty keeps the audio and the link to the source playlist. A sync adds new tracks and keeps the tracks whose source video is gone. Playback reads the stored file, not YouTube.

## What the app does

- Imports a YouTube playlist or a single video.
- Syncs a playlist on demand. A removed video keeps its stored track.
- Streams the stored audio to the web client.
- Holds several accounts on one instance. A playlist owner shares a playlist read-only or read-write with named accounts.
- Adds one pasted video to several write-accessible playlists in one action.
- Pins playlists, and sets, crops or removes a custom cover.
- Removes tracks with no playlist in a weekly job.

![A playlist detail with its cover, track list and player bar](.github/assets/readme/02-playlist.webp)

![The add-track dialog with one video link and two chosen playlists](.github/assets/readme/03-add-track.webp)

The screenshots use a demo instance with sample playlists and tracks.

## The components

```mermaid
flowchart TB
  subgraph devices["Client devices"]
    web["Web client<br/>React, Vite"]
    mobile["Mobile client<br/>planned"]
  end

  edge["Pangolin edge<br/>nginx, identity, TLS"]

  subgraph host[" "]
    server["Server<br/>Node, Fastify"]
    db[("SQLite<br/>accounts, playlists, tracks")]
    media[("Media store<br/>audio, thumbnails, covers")]
    agent["Egress agent<br/>yt-dlp and WireGuard<br/>own network namespace"]
    %% A node, not the subgraph title: the title sat where the edge arrow enters.
    hostName["Server's machine"]:::hostLabel
  end

  youtube["YouTube"]

  web --> edge
  mobile -.-> edge
  edge --> server
  server <--> db
  server <--> media
  server <-->|Unix socket| agent
  media ~~~ hostName
  agent -->|yt-dlp| youtube

  classDef client fill:#12332c,stroke:#4cac90,color:#e6e9ea
  classDef edgeRole fill:#132b3d,stroke:#44779c,color:#e6e9ea
  classDef serverRole fill:#1c2025,stroke:#6e7379,color:#e6e9ea
  classDef database fill:#1a1f26,stroke:#8b9299,color:#e6e9ea
  classDef mediaRole fill:#2a2116,stroke:#e39a3c,color:#e6e9ea
  classDef egress fill:#241d33,stroke:#7a63b0,color:#e6e9ea
  classDef source fill:#3a1c1c,stroke:#e0625e,color:#e6e9ea
  classDef planned fill:#14171b,stroke:#6e7379,color:#8b9299,stroke-dasharray:4 3
  classDef hostLabel fill:transparent,stroke:transparent,color:#8b9299

  style devices fill:transparent,stroke:#cfd4da
  style host fill:transparent,stroke:#cfd4da

  class web client
  class mobile planned
  class edge edgeRole
  class server serverRole
  class db database
  class media mediaRole
  class agent egress
  class youtube source

  linkStyle 0,1,2 stroke:#649fcb
  linkStyle 3 stroke:#8b9299
  linkStyle 4 stroke:#e39a3c
  linkStyle 5 stroke:#a78bfa
  linkStyle 7 stroke:#e0625e
```

**Web client.** A React 19 single-page application built with Vite. It draws the gallery, the playlist detail, the player and the operator's egress page. It reaches the server only through `/api/v1`.

**Server.** A Node 26 process built with Fastify 5. It owns accounts, playlists, the SQLite database, the media store, sync, streaming and the weekly prune. The download worker runs in the same process.

**Egress agent.** YouTube rate-limits or blocks an address that it sees as automated or overused. A blocked address cannot list a playlist or fetch a track, and a home connection can reach that state after many downloads. The agent gives the server a pool of WireGuard exits and sends the YouTube traffic through the active one. When YouTube refuses an exit, the server rotates to another address in the pool.

The agent runs on the host, in its own network namespace. It switches exits, measures which exit reaches YouTube, and reports the facts. The server owns the rotation policy and the stored result. The agent holds no database and no policy, and the server's other traffic never enters the tunnel.

**Edge.** Pangolin authenticates every request and injects the user identity. nginx serves the web client and proxies `/api` to the server. The server publishes no host port.

**Mobile client (planned).** An Expo application that uses the same API with a per-user Pangolin token.
