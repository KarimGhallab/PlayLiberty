# Add a video to several playlists in one batch request

Adding a manually chosen video is one top-level request, `POST /tracks`, whose body carries the video URL and a non-empty list of at most one hundred playlist ids, and whose response carries one outcome per chosen playlist, in the order the ids were sent. The outcomes are `added`, `already_present`, and `refused`, and `refused` carries no reason. The stubbed `POST /playlists/:id/tracks` is removed rather than kept beside it.

The resource the request creates is a manual association, and a manual association is a link between one track and one playlist, so a request that creates several of them has to name the one video and the several playlists. A path that already names a playlist cannot express a choice of several, which is why the nested route was the wrong shape: the only way to honour "add this song to these lists" with it is one request per list, and then the client, not the server, owns the partial result. A path nested under the video is no better, because the client does not know the video id until the server has resolved the URL, so it cannot build that path at all.

`already_present` is a success and not a failure because it is the end state the user asked for, and the association service already returns it. The result is a list rather than one status code because a single code cannot say "four added, one already had it, one refused", and a user who cannot tell which four cannot trust any of them. `refused` carries no reason because a playlist the account cannot see and a playlist it cannot write must be indistinguishable: a reason would turn the batch into a way to learn which playlist ids exist on the instance. That is the decision the playlist and sync routes already make when they answer `404` rather than `403`, and this route states it a third time rather than inventing a second rule.

The body carries a `url` field, which is the field the create-a-playlist route already takes, so the two are told apart by the presence of `playlistIds` and by the dialog, not by the URL alone. The URLs themselves are not interchangeable: create-a-playlist accepts a playlist or a video, and this route accepts a video, so a playlist URL is refused for the whole request.

Alternatives rejected:

- One request per chosen playlist, which the add-a-video dialog's design record currently specifies: it cannot present a mixed result as one result, and it multiplies the round trips by the number of playlists.
- Keeping the nested route and adding a batch route beside it: two routes for one action, and the nested one still cannot express the choice the action is for.
- A route nested under the resolved video id: the client does not have the id until the server reads the URL.
- A single overall status code: it hides the mix, which is the one thing the caller needs to act on.
- A reason on `refused`: it confirms which playlist ids exist.

Consequence worth stating: the contract changes shape here, so the input schema the nested route used is replaced and the response gains a per-playlist outcome. Ticket 02 of [`04-curate-a-playlist`](../tracker/specs/04-curate-a-playlist.md) implements this record.
