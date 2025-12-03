# PyBriscola Frontend Specification

Living document outlining the React client for the Django/Channels backend (Briscola Chiamata, 5 players).

## Product Goals
- Support full match lifecycle: lobby/join, bidding/calling, play tricks, see scores, finish match.
- Provide responsive, intuitive card-table UI with drag-and-drop for the local hand and clear trick visualization.
- Keep state in sync with backend via WebSocket (real-time events); add REST only if a gap appears.
- Be resilient to reconnects, dropped sockets, and stale state; allow seat takeover from another device.

## Players, Seating, and Table Layout
- Always 5 seats; one is the local user (highlighted), four are opponents; observer mode exists but cannot see any player hands.
- Seating is randomly assigned by the server at game start and fixed for the whole match; the join token encodes the assigned `player_id`.
- Seats remain fixed around the table (top, top-left, bottom-left, bottom-right, top-right) to reduce disorientation; player names/avatars fill in as data arrives.
- Table center shows the current trick (up to 5 cards) with order of play; completed tricks slide to a short history strip.
- Scoreboard always visible: per-player total points; highlight leader; show last trick winner for a few seconds.
- Suit trump and caller are displayed near the center; show remaining deck size if exposed by backend.

- Join/Resume: connect to the match WebSocket with a signed token obtained via join-by-link or entering a `game_id`; send `join`; receive a full snapshot for resume (seat takeover allowed; last connection wins).
- Bidding/Calling: place bids, call partner rank/suit when prompted.
- See hand: cards fan horizontally; cards are draggable to reorder locally; drag-to-play onto table center. Hand order persists across reconnects.
- Play card: allowed when it is the user's turn; invalid drops snap back with a short toast.
- Observe others: see cards played by opponents in order; after trick resolves, show winner animation and points gained. Observers see all table/trick/score info but never any hands.
- Match end: display final scores and simple rematch/exit actions.

## Interaction and Controls
- Drag and drop: local hand supports drag to reorder; drag to center area to play; mobile uses long-press to lift.
- Turn state: clear "Your turn" affordance (glow/pulse on hand and CTA button). Disable play when not allowed.
- Accessibility: keyboard support (focusable cards, Enter/Space to play selected); ARIA labels on controls and status text for screen readers.

## Data Contracts
- Transport: WebSocket-first (`ws://<host>/ws/client/`), token-authenticated; REST only if a later gap emerges.
- Tokens are issued by the web server when creating/joining via game link or manual `game_id`. Observers also receive tokens tied to a game.
- Client should tolerate out-of-order events by allowing `sync`/snapshot requests to realign.
- Game IDs: 6-character identifiers used for create/share/join flows; no listing/discovery endpoint.

### WebSocket Session, Join, Sync (token-based)
- Token: signed (JWT or Django signing) containing `game_id`, `player_id` (or `role: observer`), expiry; issued at seat claim/create or when joining via game link / entering `game_id`. Server keeps an allowlist to revoke/verify.
- Connect with `?token=...` or send it in the first `join` message.
- `join` request: `{"message_type":"join","token":"<token>","game_id":"<id>"}` (game_id optional if encoded).
- `join.ok` response: players get `{"message_type":"join.ok","game_id":"<id>","player_id":<int>,"snapshot":{...}}`; observers get `{"message_type":"join.ok","game_id":"<id>","role":"observer","snapshot":{...}}`. Snapshot includes current trick, scores, phase, trump/caller, turn, player roster with fixed seats, and the local hand only for the joined player. Hands are omitted/hidden for observers and other seats.
- `join.error`: `{"message_type":"error","code":"join_failed","reason":"..."}`
- `sync` request: `{"message_type":"sync","game_id":"<id>"}`; response mirrors `join.ok` but `message_type":"sync"`.
- Seat takeover: if another connection uses the same player token, the server accepts the new connection and may drop/notify the old one.

### Card Encoding
- Verbose, human-readable, lossless: `{"suit":"coins|cups|swords|clubs","rank":1-10}`. Ranks map to (Ace=1, 3=3, King=10, Knight=9, Jack=8, 7=7, 6=6, 5=5, 4=4, 2=2). Briscola rank order (high→low): Ace, 3, King, Knight, Jack, 7, 6, 5, 4, 2.
- Optional stable per-game `card_id` for compact references (e.g., reorder): `card_id = suit_index * 10 + (rank-1)` giving 0–39; can be sent alongside suit/rank.

### Snapshot Shape (for `join.ok` / `sync`)
Common base fields (omit sensitive data for observers):
- `message_type`: `join.ok|sync`
- `game_id`
- `phase`: `ready | bid | call-partner-rank | call-partner-suit | play-first-trick | play-tricks | trick-won | end`
- `players`: `[{player_id, name, seat}]`
- `scores`: `[{player_id, points}]`
- `current_player_id`
- `current_leader_id`
- `trump_suit` (null until known)
- `caller_id` (null until known)
- `partner_id` (null until known)
- `trick`: ordered plays for current trick `[{player_id, card}]`
- `trick_history`: optional last N tricks with winner/points
- `deck_remaining` (optional; 0 for fixed deck)
- `hand`: only for the joined player; omit for others/observers
- Observers: no `hand`; may include `role:"observer"` instead of `player_id`

Phase-specific additions:
- `ready`:
  - (no bids yet; hands dealt)
- `bid`:
  - `bids`: `[{player_id, bid}]` (`-1` = pass)
- `call-partner-rank`:
  - `bids`
- `call-partner-suit`:
  - `bids`
  - `partner_rank`: called rank
- `play-first-trick`:
  - `bids`
  - `partner_rank`
  - `trump_suit`: null until set by caller
- `play-tricks`:
  - `trump_suit` set
  - `partner_rank`
- `trick-won`:
  - `trick_cards`: completed trick `[{player_id, card}]`
  - `trick_points`: points for that trick
  - `winner_id`: winner of the trick
- `end`:
  - `end_state`: `{winner_ids:[...], final_scores:[{player_id, points}], tricks:[optional summary]}`

### Client → Server Actions (per message_type)
- All actions include a client-generated `action_id` for correlation/idempotency.
- `bid`: `{"message_type":"bid","action_id":"<uuid>","game_id":"<id>","player_id":<int>,"bid":<int|-1>}`
- `call-partner-rank`: `{"message_type":"call-partner-rank","action_id":"<uuid>","game_id":"<id>","player_id":<int>,"partner_rank":<1-10>}`
- `call-partner-suit`: `{"message_type":"call-partner-suit","action_id":"<uuid>","game_id":"<id>","player_id":<int>,"partner_suit":"coins|cups|swords|clubs"}`
- `play`: `{"message_type":"play","action_id":"<uuid>","game_id":"<id>","player_id":<int>,"card":{"suit":"...","rank":<1-10>}}`
- `reorder`: `{"message_type":"reorder","action_id":"<uuid>","game_id":"<id>","player_id":<int>,"hand":[{suit,rank} or card_id order]}`; server persists order and echoes via `hand.update` for reconnects.

### Server → Client Events
- `hand.update`: `{message_type:"hand.update", game_id, player_id, hand:[cards]}` (only sent to the owning player).
- `trick.played`: `{message_type:"trick.played", game_id, player_id, card, trick:[...], current_player_id}` to render center pile and turn arrow.
- `trick.won`: `{message_type:"trick.won", game_id, winner_id, points, trick_cards:[{card,player_id}], scores:[...], current_player_id}`
- `score.update`: `{message_type:"score.update", game_id, scores:[{player_id, points}], delta?:{player_id, points}}` (cumulative preferred; delta optional).
- `phase.change`: `{message_type:"phase.change", game_id, phase, trump_suit?, caller_id?, partner_id?, bid?, partner_rank?}`
- `player.join` / `player.leave` / `player.reconnect`: `{message_type:"player.join", game_id, player_id, name}` etc., to update seats.
- `sync`: full snapshot for state recovery (`message_type:"sync"`); same shape as in `join.ok`.
- `error`: `{message_type:"error", code, reason}` for validation issues; client should not trust the action succeeded when this arrives.
- Connection liveness: server may send `ping`; client replies `pong` or rely on WebSocket ping/pong.

Event details (proposed):
- `trick.played`: include the full current `trick` array and `current_player_id` for the next turn. Example: `{"message_type":"trick.played","game_id":"ABCD12","player_id":2,"card":{"suit":"cups","rank":1},"trick":[...],"current_player_id":3}`.
- `trick.won`: include `winner_id`, `points`, `trick_cards` (ordered), `scores` (updated totals), and `current_player_id` (leader for next trick). Example: `{"message_type":"trick.won","game_id":"ABCD12","winner_id":4,"points":11,"trick_cards":[...],"scores":[...],"current_player_id":4}`.
- `score.update`: prefer cumulative totals; deltas can be added as `delta`.
- `phase.change`: include all relevant fields for the new phase (e.g., entering `call-partner-suit` should include `partner_rank`; entering `play-first-trick` should include `trump_suit` once known).
- `hand.update`: always send ordered hand for the owner; observers do not receive hands.

### Action Results (per-action success/failure)
- Every action gets a direct reply with the originating `action_id`.
- Success: `{"message_type":"action.result","action_id":"<uuid>","status":"ok","game_id":"<id>","effects":{...}}`
- Failure: `{"message_type":"action.result","action_id":"<uuid>","status":"error","code":"invalid_turn|invalid_card|invalid_bid|unauthorized|join_failed|duplicate_connection_handled|desync","reason":"human readable","recovery":"sync|retry|noop"}`
- Server should treat duplicate `action_id` from the same player as idempotent (re-send stored result).
## State Management
- Central store (e.g., Redux Toolkit or Zustand) for match state: players, seating, scores, current trick, hand, turn, phase, connectivity.
- Derived selectors for: whose turn, canPlay(card), sorted scoreboard, trick history.
- Persist minimal local UI state (hand order, muted sounds) separately from server state.

## UI Composition (React)
- `AppShell`: layouts header (match info, connection status), main table area, footer actions.
- `TableView`: renders seats, names, avatars, and trick center.
- `Hand`: draggable card list for the local player; supports reorder and play drop target.
- `Card`: visual component with suit/rank styling; small flip-in when entering hand.
- `TrickCenter`: current trick slots (5 positions), highlight last card played, show winner banner on resolve.
- `Scoreboard`: per-player scores and last-trick points delta.
- `StatusToasts` / `ConnectionBadge`: surface errors, reconnect attempts, and turn prompts.
- `WebSocketProvider`: manages socket lifecycle and event dispatch into state.

## Visual/UX Notes
- Theme: table felt background with distinct seat pads; avoid dark-on-dark loss of contrast.
- Animations: light spring for drag; fade/slide when cards move to center; short burst highlight on trick winner.
- Responsive: mobile stacks seats vertically with compact cards; desktop uses radial layout.
- Sounds/haptics: not in milestone 1.

## Error Handling and Reconnects
- Detect socket drop; show "Reconnecting..." state; queue user actions that require socket or re-fetch snapshot on reconnect.
- If a play fails (validation), revert UI and show reason; allow retry.
- On desync suspicion (e.g., card not found), force a `sync` snapshot to realign (or REST fallback if added later).

## Testing
- Unit: reducers/selectors (turn logic, playable cards), WebSocket event handlers, utility formatting.
- Component: Hand drag/reorder, play flow, scoreboard updates, connection badge.
- Integration (mocked API/socket): full trick play-through, reconnect + resync, invalid play handling.

## Open Questions
- Finalize message schemas/fields: card encoding, bidding/calling fields, snapshot shape per phase, observer snapshot specifics.
- Error semantics: standardize `code` values (e.g., invalid_turn, invalid_card, join_failed, duplicate_connection_handled) and whether every action gets an explicit success/error reply.
