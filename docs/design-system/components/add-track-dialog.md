# Add a track

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The dialog the [playlist detail](../screens/playlist-detail.md) hosts, on both clients, and its only door for
one pasted video. It takes a video URL and a set of writable playlists, and it is **one request for the whole
batch**: `POST /tracks` resolves the video once and answers one outcome per chosen playlist.

**It is named for the track and its field takes a video URL, and that is the glossary's own distinction, not a
contradiction.** A _track_ is what the server stores; a _video_ is its source on YouTube
([`GLOSSARY.md`](../../GLOSSARY.md)). A person pastes a video and the thing that joins their playlists is a
track, so the control reads "Add a track" and the field's label reads "Video link".

**Two arrangements: a 400px centred dialog on web, a full-width sheet on mobile.** The same split
[`add a playlist`](add-playlist-dialog.md) argues for, because it is the same host and the same task shape: a
sheet is a phone's idiom for a short task and a centred card fights it. The dialog is wider than the add
dialog in practice because the playlist list is the body and it has no single field's natural width; the
measurement is settled when it is composed against real playlist names.

**The body is a list of writable playlists, and the one being looked at arrives checked.** This is the whole
reason it is not the add-playlist dialog with a second field. The current playlist is preselected (story 2), so
the common case, adding a song to the list already on screen, is one press and no second choice. Playlists the
account cannot write to are **absent, not disabled**: the add dialog's rule and the screen's own rule in
[`playlist-detail.md`](../screens/playlist-detail.md), where a control that is there and cannot be pressed is
the fault the validator already catches in the track row. A `read` collaborator never sees a playlist at all,
which is why the detail's add control is absent for that access rather than merely empty.

**A track already on a checklist entry is `already_present`, and that is a success.** The association service
returns it when the link exists, and the desired end state is the one the person asked for (story 5). The
dialog does not warn before adding, because a warning about a duplicate would be a refusal the route does not
make.

**The request is one `POST /tracks` and the report is one outcome per playlist.** The contract is
`{ results: [{ playlistId, outcome }] }` with `outcome` one of `added`, `already_present`, `refused`, and
there is deliberately **no overall status**. A single code cannot say "four added, one already had it, one
refused", and a person who cannot tell which four cannot trust any of them (spec 04). So the dialog's second
state is a per-playlist verdict, not a single message.

## The refusal state, and why the dialog stays open

**The dialog closes on an all-success outcome and stays open on any `refused`.** `added` and
`already_present` are both success, so a batch with no refusal closes the way the add dialog does, and no
report is shown: there is nothing to read. A refusal is the one outcome that needs attention before the person
leaves, and the dialog is the only place that knows which playlist refused, so it is where the refusal is
named, by playlist name, in the list the person just chose from.

**The copy is honest about what a refusal means.** `refused` carries no reason on purpose: a playlist the
account cannot see and one it cannot write to are one answer, so the batch is never a way to discover which
ids exist. The dialog's sentence is therefore about the outcome and not the cause, the same rule
[`add a playlist`](add-playlist-dialog.md) states for its field. A refusal is also per playlist, so a mixed
batch is normal rather than a fault (spec 04).

**The three cases the copy has to cover:**

| outcomes                        | what happened      | the sentence the dialog owes                           |
| ------------------------------- | ------------------ | ------------------------------------------------------ |
| all `added` / `already_present` | what was asked for | the dialog closes; nothing is shown                    |
| some `refused`                  | a mix              | name the refused playlists and say the rest were added |
| all `refused`                   | nothing happened   | say nothing was added, without naming a cause          |

**The heading and body are true in both states.** The dialog is two surfaces, choosing and reporting, so its
title ("Add a track") and its field do not move, and only the block under the list changes. A second heading
for the refusal state would be a second dialog the person did not open.

## The field, the actions and the busy state

**One URL field, a video only.** A playlist URL pasted here is refused for the whole request: "add a track"
takes a video, and the same field in the add dialog creates a playlist. The refusal is the client's own check
first, then the server's, in one slot, the same two-layer arrangement `add a playlist` uses.

**The primary button is "Add" and becomes "Adding" with a spinner while the batch is in flight.** The
`--motion-base` fade and the reduced-motion path are the shared shell's; this dialog adds one field and one
list.

**The list is checked by the account, and the check is a real control, not a decorative mark.** A coordinator
would fail [`form controls`](form-controls.md)' rule that a mark takes the colour it sits in and costs no
rule; the row is a label over a checkbox, so the mark is the checkbox's own and the label carries the name.

## Usage

Do keep the whole batch as one request. Do start the current playlist checked and leave every writable one
selectable. Do show `already_present` as success, because it is. Do name the refused playlists by name and say
nothing about the cause. Do not invent a per-playlist reason: the route refuses without one. Do not disable a
playlist the account cannot write to; leave it out. Do not show a report for an all-success batch.

## Not this

A second field for a playlist name, which would duplicate the add dialog and has nowhere to write it. A
preview of the video's title before adding, which needs a route that resolves a URL and does not exist as a
client-facing read. A per-playlist reason on a refusal, which the route deliberately withholds so the batch
cannot enumerate other accounts' playlists.
