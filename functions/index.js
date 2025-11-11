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
    const batch = db.batch();
    let hasUpdates = false;

    gamesSnap.forEach((gameDoc) => {
      const gameData = gameDoc.data() || {};
      const startMillis = toMillis(gameData.startAt);
      const endMillis = toMillis(gameData.endAt);
      const { scheduleStatus, active } = computeState(startMillis, endMillis, now);

      const changes = {};
      if (gameData.scheduleStatus !== scheduleStatus) {
        changes.scheduleStatus = scheduleStatus;
      }
      if (gameData.active !== active) {
        changes.active = active;
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
