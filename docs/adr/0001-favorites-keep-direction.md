---
status: accepted
---

# Favorites keep the direction they were saved from

A Favorite used to be only route, service type and Stop, so saving a Stop at a terminus where both directions call showed both directions on the Favorite board (272S at Diamond Hill appeared once to Science Park and once back to Diamond Hill). In Nov 2026 we rejected adding direction because the board already separates directions and a stored-format change needs a migration; we reversed that once the extra row proved to be the reported bug. A Favorite now carries an optional `bound`, and a Favorite without one stays a legacy Favorite covering every direction.

## Considered Options

- **Hide the opposite direction in the board only**, with no change to what is stored: rejected, because the board cannot tell which direction the user meant, and showing the wrong direction is the bug.
- **Make `bound` required and migrate stored Favorites**: rejected. A legacy Favorite does not know its direction, so any migration would have to guess or duplicate it. Keeping `bound` optional needs no migration and leaves existing users' boards unchanged.

## Consequences

- The stored list stays under the same key (`baseRoutesToFetch`), and old entries load unchanged.
- A legacy Favorite and a directed one at the same Stop and Route are separate Favorites; the board shows each direction once.
- The two directions of one Route at one Stop are two Favorites, saved and removed separately.
