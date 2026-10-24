// Spec 021 (permissions): fills `strategicGameOwner` and `accessType` of the tactical games created before the API
// stored them. rmu-api-tactical copies both from the strategic game when it creates a tactical game: the owner of the
// strategic game also manages the tactical game, and its accessType says who reads it.
//
// For each tactical game without `strategicGameOwner` or `accessType`, it reads the strategic game in the strategic
// database (same Mongo server, as in the rmu-platform compose) and sets:
// - `strategicGameOwner`: the `owner` of the strategic game;
// - `accessType`: the `accessType` of the strategic game, `private` when it has none.
// A tactical game whose strategic game no longer exists gets `accessType: private` and no `strategicGameOwner`: only
// its owner and the admins manage it. Idempotent: games that have both fields are not touched.
//
// Run from rmu-platform, after a backup (make mongo-backup):
//   make mongo-migrate f=../rmu-api-tactical/scripts/migrations/021-tactical-game-strategic-owner.js DRY_RUN=1
//   make mongo-migrate f=../rmu-api-tactical/scripts/migrations/021-tactical-game-strategic-owner.js
// TACTICAL_DB / STRATEGIC_DB (defined before the script, like DRY_RUN) change the database names.

const dryRun = typeof DRY_RUN !== 'undefined' && DRY_RUN === true;
const tacticalDb = db.getSiblingDB(typeof TACTICAL_DB !== 'undefined' ? TACTICAL_DB : 'rmu-tactical');
const strategicDb = db.getSiblingDB(typeof STRATEGIC_DB !== 'undefined' ? STRATEGIC_DB : 'rmu-strategic');
const tacticalGames = tacticalDb.getCollection('tactical-games');
const strategicGames = strategicDb.getCollection('strategic-games');

const pending = tacticalGames.find(
  { $or: [{ strategicGameOwner: { $exists: false } }, { accessType: { $exists: false } }] },
  { _id: 1, strategicGameId: 1, strategicGameOwner: 1, accessType: 1 },
);

const counts = { pending: 0, updated: 0, missingStrategicGame: 0 };
const missing = [];

pending.forEach((game) => {
  counts.pending += 1;
  const strategic = strategicGames.findOne({ _id: game.strategicGameId }, { owner: 1, accessType: 1 });
  const $set = {};
  if (!strategic) {
    counts.missingStrategicGame += 1;
    missing.push(`${game._id} (strategic game ${game.strategicGameId})`);
  } else if (!game.strategicGameOwner && strategic.owner) {
    $set.strategicGameOwner = strategic.owner;
  }
  if (!game.accessType) {
    $set.accessType = (strategic && strategic.accessType) || 'private';
  }
  if (Object.keys($set).length === 0) {
    return;
  }
  counts.updated += 1;
  if (!dryRun) {
    tacticalGames.updateOne({ _id: game._id }, { $set });
  }
});

print(`${dryRun ? '[dry run] ' : ''}tactical games without strategicGameOwner or accessType: ${counts.pending}`);
print(`${dryRun ? '[dry run] would update' : 'updated'}: ${counts.updated}`);
print(`without strategic game: ${counts.missingStrategicGame}`);
missing.forEach((line) => print(`  ${line}`));
