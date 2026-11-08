# Manage the egress on mobile

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

When a sync is blocked because every exit is down, the person who can fix it is the instance's admin, and the fix
lives on a page that only a laptop can reach. Spec `16` put the console on the web and excluded the mobile client,
because the console is operator information. That exclusion was taken before the app carried an admin identity and an
account sheet, and the moment an admin needs it is the moment they are away from the desk with a phone in hand.

The second problem is the shape. The web's console is a table at 880 and a card list below it; a phone has no table,
and a tooltip that names an exit's country has no mobile analogue.

## Solution

An egress route behind the admin gate, reached from the library header's door. It draws one card per exit with its name, its
endpoint, its status word and tone, when it was last attempted and the country its address resolves to, plus the one
action that row allows: Switch on a standby and Check on the active exit. One action runs at a time, the pressed card
is busy, and the pool's agent is reported at the top as reachable or down. A non-admin never sees the door and the
route answers the not-found body.

## Implementation Decisions

- **The route is pushed from the library header's door and exists only for an admin.** The door is drawn from the
  account read's role, and the route's guard answers the not-found body to everyone else. `Decided here:` the web's rule,
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
- **This spec reverses spec `16`'s exclusion of the mobile client.** The console's server half is unchanged.

## Out of Scope

- A scheduled or automatic switch or check, and any rotation control on the page.
- Check history, charts, metrics, alerting and a notification when an exit dies.
- Making the console visible to non-admins.
- The server's pool configuration and the agent's protocol.
- A second egress screen for the blocked sync state; the sync band stays on the detail.
