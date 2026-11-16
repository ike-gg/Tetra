// Lua runs atomically in Redis, so the queue never needs a client-side transaction.
// Alive keys are built from a prefix inside the script (single Redis, not cluster-safe).

/**
 * KEYS: tickets zset, lock. ARGV: ticket, lock TTL (ms), alive-key prefix.
 * Drops tickets whose alive key expired (crashed shard), then: 0 = lock taken (ticket
 * removed from the queue), n > 0 = position among live tickets (1 = next), -1 = the
 * ticket isn't queued (pruned; the caller re-enqueues it).
 */
export const ACQUIRE_SCRIPT = `
local tickets = redis.call('ZRANGE', KEYS[1], 0, -1)
local position = 0
local found = false
for _, ticket in ipairs(tickets) do
  if redis.call('EXISTS', ARGV[3] .. ticket) == 0 then
    redis.call('ZREM', KEYS[1], ticket)
  else
    position = position + 1
    if ticket == ARGV[1] then
      found = true
      break
    end
  end
end
if not found then return -1 end
if position == 1 and redis.call('SET', KEYS[2], ARGV[1], 'NX', 'PX', ARGV[2]) then
  redis.call('ZREM', KEYS[1], ARGV[1])
  return 0
end
return position
`;

/** KEYS: key. ARGV: owner, TTL (ms). Extends the key only while `owner` holds it. */
export const REFRESH_IF_OWNER_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
`;

/** KEYS: key. ARGV: owner. Deletes the key only while `owner` holds it. */
export const DELETE_IF_OWNER_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;
