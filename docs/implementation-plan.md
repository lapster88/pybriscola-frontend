# Frontend Implementation Plan (pybriscola-frontend)

## State & Contracts
- Add central store (Redux Toolkit or Zustand): players/seats, scores, phase, bids, trick/current/history, hand (ordered), turn, connectivity, role (player/observer).
- WebSocket client: token-based connect, send `join`, `sync`, `ping/pong` handling; generate `action_id` for all actions; handle `action.result` plus events.
- Selectors: whose turn, playable cards, bid state, observer-safe views.

## UI
- Shell/layout: header (match info, connection badge), table area, footer actions.
- Components: Table/Seats, Hand (drag/reorder + play drop), Card, TrickCenter, Scoreboard, Bidding/Calling UI, StatusToasts, ConnectionBadge.
- Responsive layout; observer mode hides hands.

## Actions & Flows
- Implement messages: `bid`, `call-partner-rank`, `call-partner-suit`, `play`, `reorder` with `action_id`.
- Join/resume: connect with token, send `join`, apply snapshot; on drop, reconnect and `sync`.
- Handle `action.result` (success/error codes) and authoritative events (`trick.played`, `trick.won`, `phase.change`, `hand.update`, `score.update`, `player.join/leave/reconnect`).

## Testing
- Reducers/selectors unit tests; WS handlers.
- Component tests: Hand drag/drop, play, bidding/calling, connection badge.
- Integration with mocked WS server: create → join → bid/call → play → trick resolution → reconnect.
