# Prune orphaned tracks

Status: agreed
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

Removing the last association to a track leaves the audio on disk, and nothing ever reclaims it. The weekly job
exists and is wired to a cron, and `pruneOrphanTracks` logs that it is not implemented and returns zero, so the
instance grows for as long as it runs. A listener who curates hard, or a household that deletes a playlist it
no longer wants, pays for the difference in disk forever, with no way to see it happening and no way to undo
it.

The reason this is delicate is that the same rule that makes deletion safe makes it easy to get wrong in the
other direction. A track with no associations looks exactly like a track whose file has not arrived yet, a
track mid-download, and a track whose playlist was deleted a moment ago and whose removal has not been swept.
Deleting any of those is silent data loss, and the product's first promise is that a stored track survives. The
prune is therefore the one job in the server whose bug is unrecoverable, and the only place where a scheduling
mistake becomes permanent.

## Solution

One scheduled job, on a configurable weekly cadence, finds tracks that no playlist associates any more, removes
their stored media and their thumbnails, and then removes the track. It never touches a track that any playlist
still holds, whatever state that track is in. It never runs while a track is being downloaded. And anything it
cannot finish this week is left for the next week, or for the sweep that already runs when the server starts,
rather than being forced through.

## User Stories

1. As a listener, I want the disk to be reclaimed after I delete a playlist, so that the instance does not grow
   without limit.
2. As a listener, I want the audio I still use to be safe from any scheduled cleanup, so that a weekly job
   cannot take a song I play.
3. As a listener, I want a track whose playlist I deleted to be reclaimed, so that deleting is a real deletion.
4. As a listener, I want a track I removed from one playlist but kept in another to be left alone, so that
   pruning follows references rather than history.
5. As a listener, I want a track whose download has not finished yet to be left alone, so that a cleanup cannot
   cancel work in progress.
6. As a listener, I want a track that failed to download to eventually be reclaimed once nothing holds it, so
   that a broken track does not sit on the disk forever.
7. As a listener, I want a track whose video is gone but which I still keep to survive indefinitely, so that
   the promise of the product is not time limited.
8. As a member of a household, I want a track shared with a collaborator to be safe from cleanup, so that
   somebody else's playlist protects the file too.
9. As a member of a household, I want one track with no remaining references anywhere to be removed once, so
   that two people dropping the same song does not leave an orphan behind.
10. As an operator, I want the cleanup to run on a schedule I configure, so that the instance's rhythm is mine
    and not a constant's.
11. As an operator, I want the cleanup to be quiet when it finds nothing, so that a healthy instance is not
    filling logs every week.
12. As an operator, I want to know how many tracks a cleanup removed, so that I can see the instance working.
13. As an operator, I want a cleanup that fails on one track to continue with the others, so that one bad file
    does not stop the job.
14. As an operator, I want a track whose media cannot be deleted to be left for next time rather than
    half-removed, so that the database never claims a file that is not there.
15. As an operator, I want the job to stop cleanly with the server, so that a shutdown does not interrupt a
    deletion midway.
16. As an operator, I want the job to be protected from overlapping itself, so that a slow run cannot be joined
    by a second one.
17. As an operator, I want the startup sweep to remain the backstop, so that a crash during a cleanup
    eventually resolves.
18. As an operator, I want the job to never be triggered by a user request, so that a client cannot make the
    instance delete things.

## Implementation Decisions

- **An orphan is a track with zero associations, and nothing else qualifies.** The rule is deliberately the
  simplest statement in this set, because it is the one that has to hold when the file is already gone. A track
  is not an orphan because its download failed, because its source video is gone, because its playlist was
  deleted this week, or because nothing has referenced it lately. Only the absence of any association makes it
  one, and a remote-removed track that is still in a playlist is therefore never a candidate, which is what
  makes the retention promise permanent rather than weekly.
- **Media is removed before the row, and the two are in one transaction per track.** Deleting the row first
  would orphan the file on disk with nothing left to find it by, and no later run could ever reclaim it,
  because the sweep and the prune both start from rows. Removing the file first and failing afterwards leaves a
  row that claims a file which is not there, which is the failure a stream request would surface as a broken
  track.
- **A track whose media cannot be removed is skipped and left for the next run,** with the reason logged, and
  its row stays. The alternative, deleting the row anyway, trades a leaked file for a broken track, and a
  leaked file is recoverable by hand while a row pointing at nothing is not.
- **A track that is currently downloading is skipped.** It is claimed by the worker of
  [`02-store-a-track`](02-store-a-track.md), and the worker holds a file it is writing; deleting its row
  mid-download produces a file with no row, which is exactly the state the ordering above exists to prevent.
- **A run processes tracks in bounded batches and stops claiming new ones when it is told to stop,** so a
  shutdown during a cleanup leaves the remaining tracks for the next run rather than half done. The scheduler
  already refuses to start a second job while one is running.
- **The cadence is configuration, defaulting to weekly,** and nothing else triggers the job. There is no route
  that prunes, no route that schedules one, and no parameter on any route that reaches it, because a job that
  deletes files should not be reachable from a client.
- **The count of removed tracks is logged, and the scheduler already logs it.** A run that removes nothing logs
  at the same level as any other and adds no error. _Decided here:_ a healthy instance should not have to
  distinguish a quiet week from a fault.
- **A pruned track's row, audio file and thumbnail all go.** The thumbnail is a cached image of something the
  instance no longer holds a claim to, so keeping it would be keeping the only copy of a picture of a file that
  no longer exists.
- **Deleting a playlist and pruning its tracks are different acts on purpose.** The playlist goes when the user
  asks, which [`04-curate-a-playlist`](04-curate-a-playlist.md) owns, and the media goes on the schedule, so
  deleting a playlist is never waiting on a disk operation and a long prune is never in the way of an action.
  The interval between the two is the price, and it is configurable.
- **The startup sweep stays the backstop and is not replaced by this.** It already empties the temporary
  directory and returns interrupted downloads to pending after a crash, and it is what makes a cleanup that was
  interrupted by a restart converge rather than leave a track claimed by nothing.
- **The prune is a scan of associations, not of the media directory.** The database is the authority on what is
  referenced, and the media directory is swept for what is not, by the existing startup sweep. A prune that
  walked the disk would have to decide what a file with no row is, and that question belongs to the sweep.
- **The prune holds the same single-process assumption the worker does.** One server process means one prune and
  one worker, so the coordination between them is a check on a status rather than a distributed lock.
- **Nothing about the prune is visible to the web client.** It writes no state a screen reads, and it is the one
  feature in the set with no client clause at all. A track that the prune removes is gone from a playlist only
  because something already removed its last association.
- **Inherited constraints are owned by the ADRs and not restated here:** no transcoding and the AAC/M4A store ([`0002`](../../adr/0002-no-transcoding-store-aac-m4a.md)). The retention promise that a stored track survives its source is owned by [`PRODUCT.md`](../../PRODUCT.md).

## Testing Decisions

- **One seam, at the highest point available.** The prune is invoked directly rather than through a clock, so a
  test states the state it builds and the state it expects afterwards and does not wait a week. The real
  database and the real media root, in a temporary directory, so that what is asserted is what a file would be.
- **What makes a good test here** is what survives and what is gone, never the order of deletes or the number of
  queries. A test that asserts two unlink calls is a test of the implementation; one that asserts the file is
  still on disk and the row is still there is a test of the behaviour.
- **The cases that must exist:**
  - a track with no associations has its row, its audio file and its thumbnail removed;
  - a track with one association survives entirely, with its file intact, whatever its file status and whatever
    its source status;
  - a remote-removed stored track that is still in a playlist survives;
  - a track associated only through another account's playlist survives;
  - a failed track with no associations is removed;
  - a downloading track is skipped and survives;
  - a track whose media cannot be removed keeps its row and is removed on a later run once the file is gone;
  - removing the last association to a track does not remove anything immediately, and the next run does;
  - deleting a playlist leaves its media in place and the next run reclaims it;
  - a run that finds nothing removes nothing and reports zero;
  - the returned count equals the number of tracks actually gone;
  - a track that only a suppressed video would re-add is still an orphan, since suppression is not a reference.
- **Prior art:** the scheduler already exists with its guard against overlapping runs, its stop handle and its
  logging, and the startup sweep is the existing precedent for reconciling rows against files in a temporary
  directory. The prune follows both rather than inventing a shape.

## Out of Scope

- Any way for a client to trigger, schedule, or configure a prune.
- Pruning by age, by size, by account, or by any rule other than zero references.
- A quota, a disk ceiling, or a warning when the media store grows. The instance operator watches the disk.
- Reclaiming space from a file that is still referenced. Storage is not compressed or deduplicated further.
- Any change to what a sync does, and any change to retention.
- Replacing the startup sweep, or moving the sweep's work into this job.
- Recovering a pruned track. There is no second copy, and pretending otherwise would be a lie in the interface.
