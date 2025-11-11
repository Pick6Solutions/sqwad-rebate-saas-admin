import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from './firebase.js';

function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function computeState(startMillis, endMillis, now) {
  if (!startMillis || !endMillis) {
    return { scheduleStatus: 'unscheduled', active: false };
  }
  if (now < startMillis) {
    return { scheduleStatus: 'upcoming', active: false };
  }
  if (now >= startMillis && now <= endMillis) {
    return { scheduleStatus: 'active', active: true };
  }
  return { scheduleStatus: 'completed', active: false };
}

export const remoteScheduledCheck = onSchedule('* * * * *', async () => {
  const now = Date.now();
  const shopsSnap = await db.collection('shops').get();

  for (const shopDoc of shopsSnap.docs) {
    const gamesSnap = await shopDoc.ref.collection('games').get();
    if (gamesSnap.empty) continue;

    const games = gamesSnap.docs.map((gameDoc) => {
      const gameData = gameDoc.data() || {};
      const startMillis = toMillis(gameData.startAt);
      const endMillis = toMillis(gameData.endAt);
      const computed = computeState(startMillis, endMillis, now);
      return { gameDoc, gameData, startMillis, computed };
    });

    const activeGames = games
      .filter(({ computed }) => computed.active)
      .sort((a, b) => {
        const aStart = typeof a.startMillis === 'number' ? a.startMillis : Number.POSITIVE_INFINITY;
        const bStart = typeof b.startMillis === 'number' ? b.startMillis : Number.POSITIVE_INFINITY;
        if (aStart !== bStart) return aStart - bStart;
        return a.gameDoc.id.localeCompare(b.gameDoc.id);
      });

    const allowedActiveId = activeGames.length ? activeGames[0].gameDoc.id : null;

    const batch = db.batch();
    let hasUpdates = false;

    games.forEach(({ gameDoc, gameData, computed }) => {
      const desired = { ...computed };
      if (allowedActiveId && gameDoc.id !== allowedActiveId && desired.active) {
        desired.active = false;
        desired.scheduleStatus = 'inactive';
      }

      const changes = {};
      if (gameData.scheduleStatus !== desired.scheduleStatus) {
        changes.scheduleStatus = desired.scheduleStatus;
      }
      if (gameData.active !== desired.active) {
        changes.active = desired.active;
      }

      if (Object.keys(changes).length > 0) {
        batch.update(gameDoc.ref, changes);
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      await batch.commit();
    }
  }
});
