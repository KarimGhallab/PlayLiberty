# Manage the egress on mobile

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

When a sync is blocked because every exit is down, the person who can fix it is the instance's admin, and the fix
lives on a page that only a laptop can reach. Spec `16` put the console on the web and excluded the mobile client,
because the console is operator information. That exclusion was taken before the app carried an admin identity and an
account sheet, and the moment an admin needs it is the moment they are away from the desk with a phone in hand.

The second problem is the shape. The web's console is a table at 880 and a card list below it; a phone has no table,
and a tooltip that names an exit's country has no mobile analogue.

## Solution

An egress route behind the admin gate, reached from the account sheet. It draws one card per exit with its name, its
endpoint, its status word and tone, when it was last attempted and the country its address resolves to, plus the one
action that row allows: Switch on a standby and Check on the active exit. One action runs at a time, the pressed card
is busy, and the pool's agent is reported at the top as reachable or down. A non-admin never sees the door and the
route answers the not-found body.

## User Stories

1. As an admin, I want the egress console from my account sheet, so that I can reach it from a phone.
2. As an admin, I want to see every exit, so that I know what the pool holds.
3. As an admin, I want each exit's endpoint, so that I know where it goes.
4. As an admin, I want each exit's status, so that I know which one is healthy.
5. As an admin, I want the status in words as well as a tone, so that it is not carried by colour.
6. As an admin, I want the last attempt's date, so that I know how stale the verdict is.
7. As an admin, I want the active exit marked, so that I know which one carries the traffic.
8. As an admin, I want Switch on a standby, so that I can move the traffic to it.
9. As an admin, I want the switch to check the new exit, so that its verdict is what the row stores.
10. As an admin, I want Check on the active exit, so that I can re-verify without switching.
11. As an admin, I want one action at a time, so that two rotations never race.
12. As an admin, I want a busy state on the card I pressed, so that I know the action is running.
13. As an admin, I want a success toast, so that I know the action landed.
14. As an admin, I want a failure toast, so that I know it did not.
15. As an admin, I want the agent reported as reachable or down, so that I know whether the pool is answering at all.
16. As an admin, I want the exit's country, so that I recognise where the traffic leaves.
17. As an admin, I want a read failure with a retry, so that a network fault is not an empty pool.
18. As an admin, I want a loading state, so that an empty pool is not drawn while the read is in flight.
19. As an admin, I want an empty state, so that a pool with no exits says so.
20. As an admin, I want to pull the screen down to refresh, so that I can force a re-read.
21. As a non-admin, I want no door, so that I am not offered a screen I cannot use.
22. As a non-admin, I want the route to answer not-found, so that the app does not confirm the console exists.
23. As an admin, I want the console to have no rotation control, so that the page cannot do what the server's policy does.
24. As an admin, I want no history or charts, so that the screen stays a current-state page.
25. As a screen-reader user, I want each card announced with its exit, status and action, so that I can operate it.
26. As a French-speaking admin, I want the console in French, so that the app stays in my language.

## Implementation Decisions

- **The route is pushed from the account sheet and exists only for an admin.** The door is drawn from the account
  read's role, and the route's guard answers the not-found body to everyone else. `Decided here:` the web's rule,
  kept because the console is operator information and a household account has no action to take.
- **The pool is cards, one per exit.** Each card draws the name, the endpoint, the status word with its tone, the last
  attempt date and the country the address resolves to, with the flag glyph beside the name. The active card shows
  Check and a standby shows Switch. `Decided here:` a table is a browser shape and a phone has no columns; the card
  is the same information stacked.
- **The country is drawn, not tipped.** The web's hover tooltip becomes the row's own word, because a phone has no
  hover. `Decided here:` the disposition of a web-only affordance, recorded rather than ported.
- **One action runs at a time.** The pressed card is busy and every other action is disabled until it answers. The
  action is the existing Switch or Check, and the switch runs the check.
- **The agent's reachability is a line at the top**, drawn as reachable or down with its tone, and it is read with the
  pool.
- **A success or failure is a toast.** A refused action also leaves the card's state as the read reported it, because
  the page never guesses the new state.
- **The screen pulls to refresh**, for the same reason the gallery does: the phone has no reload button and the pool
  changes only on an action.
- **There is no rotation control, no history, no chart and no timer.** The server's policy owns rotation.
- **Inherited decisions are referenced, not restated:** the pool table, the status values, the switch's apply-then-check,
  the check's read-only nature, the agent's authority and the cooldown are
  [`16-tunnel-the-youtube-egress`](16-tunnel-the-youtube-egress.md)'s; the admin role is the glossary's.

## Testing Decisions

- A test earns its place only if it fails when an admin would notice. The tests assert which action each card
  offers, that only one action can be in flight, that a non-admin gets the not-found body, and that the agent's line
  reflects the read. They do not assert the card's layout or the toast's timing.
- **The console is tested at the screen's seam** with the pool read and the actions mocked: the active and standby
  actions, the busy state, the agent's two states, the empty and failure states, and the two toasts. Prior art is the
  web's `EgressPage` tests.
- **The guard is tested at the router's seam**: an admin reaches the route, a non-admin gets not-found.
- **The critical journey is a Maestro flow**: open the console from the account sheet, switch to a standby, and see
  the new active card.
- **Cut tests:** no test of the flag glyph, the card's tone, or the cooldown's timing.

## Out of Scope

- A scheduled or automatic switch or check, and any rotation control on the page.
- Check history, charts, metrics, alerting and a notification when an exit dies.
- Making the console visible to non-admins.
- The server's pool configuration and the agent's protocol.
- A second egress screen for the blocked sync state; the sync band stays on the detail.

## Further Notes

- This spec reverses spec `16`'s exclusion of the mobile client, and the amendment is part of this corpus's work.
  The console's server half is unchanged.
