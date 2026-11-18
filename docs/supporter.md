# Supporter (planned)

A notebook of what the paid tier could give. **Nothing here is implemented or promised**: collect ideas, then settle them before building.

## Naming

The paid tier is being renamed from **premium** to **supporter**. Not done yet: code (`/premium`, `hasPremium`, `tetra_premium` emoji, entitlement helpers) and copy still say premium. Do the rename as one separate change; until then, new user-facing text should not introduce more "premium". Note that `guildParsePremium` / `premiumTier` refer to Discord server boosts, not to Tetra's tier, and keep their names.

## Ideas

- **Longer retention.** Free: editor tasks 14 days, removed emotes 14 days (see [core.md](core.md)). Supporter could keep them longer, e.g. 90 days, and raise the 20-task cap.
- **Media queue priority.** `ticketScore` in the media queue (`apps/core/src/lib/media/queue/`) is the one place a priority would go.
