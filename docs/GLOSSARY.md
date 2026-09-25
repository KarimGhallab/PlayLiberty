# Glossary

One word per idea. When a concept has two names here, pick the one in the left column and change the other.

## The library

| Term            | Meaning                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Playlist        | A YouTube playlist the user points PlayLiberty at, addressed by its YouTube playlist id.            |
| Source playlist | That playlist as it exists on YouTube right now. It may lose videos over time.                      |
| Track           | One playable audio item in the library, derived from one YouTube video.                             |
| Track identity  | The YouTube video id (a string). Never the display title, which can change or repeat.               |
| Library         | The retained collection of tracks PlayLiberty owns, independent of whether the source videos exist. |
| Library track   | A track that has been synced and is retained; it survives its source video's deletion.              |

## The sync

| Term          | Meaning                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Sync          | The operation that reconciles the library with a source playlist: add new videos, retain tracks whose source video is gone. |
| Sync run      | One execution of a sync, with an outcome recorded.                                                                          |
| Removed video | A source video no longer available on YouTube. It does not remove its library track.                                        |

## Naming it

| Term    | Meaning                                                                              |
| ------- | ------------------------------------------------------------------------------------ |
| YouTube | The external service PlayLiberty reads playlists and media from. Always capitalized. |

## Terms that are easy to mix up

- **Playlist** vs **Library**: a playlist is the remote, mutable input; the library is the retained, durable output. Say "playlist" for the source, "library" for what PlayLiberty keeps.
- **Track** vs **Video**: a track is a library item; a video is its source on YouTube. The library holds tracks, not videos.
- **Sync** vs **Import**: sync reconciles over time and is repeatable; import suggests a one-time copy. PlayLiberty syncs.
