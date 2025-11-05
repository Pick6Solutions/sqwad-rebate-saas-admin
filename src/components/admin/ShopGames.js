import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../base';
import DatePicker from '../utils/DatePicker';
import { ErrorMessage, Toast, WarningMessage } from '../utils/HelpfulFunction';

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date) {
  if (!date) return 'Not scheduled';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function deriveStatus(game) {
  const { scheduleStatus, active, startAt, endAt } = game;
  const status = scheduleStatus || (active ? 'active' : null);
  if (status === 'active') return { label: 'Active', className: 'badge-success' };
  if (status === 'upcoming') return { label: 'Upcoming', className: 'badge-info' };
  if (status === 'completed') return { label: 'Completed', className: 'badge-secondary' };
  if (!startAt || !endAt) return { label: 'Unscheduled', className: 'badge-secondary' };
  const now = Date.now();
  if (now < startAt.getTime()) return { label: 'Upcoming', className: 'badge-info' };
  if (now > endAt.getTime()) return { label: 'Completed', className: 'badge-secondary' };
  return { label: 'Active', className: 'badge-success' };
}

function evaluateScheduleState(startAt, endAt) {
  if (!(startAt instanceof Date) || !(endAt instanceof Date)) {
    return { scheduleStatus: 'unscheduled', active: false };
  }
  const now = Date.now();
  if (now < startAt.getTime()) {
    return { scheduleStatus: 'upcoming', active: false };
  }
  if (now >= startAt.getTime() && now <= endAt.getTime()) {
    return { scheduleStatus: 'active', active: true };
  }
  return { scheduleStatus: 'completed', active: false };
}

function ShopGames({ shopId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [gameName, setGameName] = useState('');
  const [startAt, setStartAt] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const gamesCol = useMemo(() => (shopId ? collection(db, 'shops', shopId, 'games') : null), [shopId]);

  useEffect(() => {
    if (!gamesCol) return undefined;
    setLoading(true);
    const q = query(gamesCol, orderBy('startAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          const parsedStart = toDate(data.startAt);
          const parsedEnd = toDate(data.endAt);
          const { scheduleStatus, active } = evaluateScheduleState(parsedStart, parsedEnd);
          return {
            id: d.id,
            ...data,
            startAt: parsedStart,
            endAt: parsedEnd,
            scheduleStatus: data.scheduleStatus || scheduleStatus,
            active: typeof data.active === 'boolean' ? data.active : active,
          };
        });
        setGames(list);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load games', err);
        setLoading(false);
        ErrorMessage.fire({
          title: 'Could not load games',
          text: 'Refresh and try again.',
        });
      }
    );
    return () => unsub();
  }, [gamesCol]);

  const resetForm = useCallback(() => {
    setEditingGame(null);
    setGameName('');
    setStartAt(null);
    setEndAt(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    resetForm();
  }, [resetForm]);

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (game) => {
    if (!game) return;
    setEditingGame(game);
    setGameName(game.name || game.gameName || '');
    setStartAt(game.startAt || null);
    setEndAt(game.endAt || null);
    setModalOpen(true);
  };

  const goToOrders = useCallback(
    (game) => {
      if (!shopId || !game?.id) return;
      navigate(`/shops/${encodeURIComponent(shopId)}/games/${encodeURIComponent(game.id)}/orders`);
    },
    [navigate, shopId]
  );

  const handleSave = async () => {
    const trimmedName = (gameName || '').trim();
    if (!trimmedName) {
      ErrorMessage.fire({ title: 'Missing Info', text: 'Please enter a game name.' });
      return;
    }
    if (!startAt || !endAt) {
      ErrorMessage.fire({ title: 'Missing Schedule', text: 'Please select a start and end time.' });
      return;
    }
    if (startAt >= endAt) {
      ErrorMessage.fire({
        title: 'Invalid Schedule',
        text: 'The start time must be before the end time.',
      });
      return;
    }
    if (!shopId) {
      ErrorMessage.fire({
        title: 'No shop selected',
        text: 'Reload and try again.',
      });
      return;
    }

    try {
      setSaving(true);
      const computedState = evaluateScheduleState(startAt, endAt);
      if (editingGame) {
        await updateDoc(doc(db, 'shops', shopId, 'games', editingGame.id), {
          name: trimmedName,
          startAt: Timestamp.fromDate(startAt),
          endAt: Timestamp.fromDate(endAt),
          updatedAt: serverTimestamp(),
          scheduleStatus: computedState.scheduleStatus,
          active: computedState.active,
        });
        Toast.fire({ title: 'Game updated' });
      } else if (gamesCol) {
        await addDoc(gamesCol, {
          name: trimmedName,
          startAt: Timestamp.fromDate(startAt),
          endAt: Timestamp.fromDate(endAt),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          scheduleStatus: computedState.scheduleStatus,
          active: computedState.active,
        });
        Toast.fire({ title: 'Game scheduled' });
      }
      closeModal();
    } catch (e) {
      console.error('Failed to save game', e);
      ErrorMessage.fire({
        title: 'Save failed',
        text: 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteGame = async (game) => {
    if (!game) return;
    if (!shopId) {
      ErrorMessage.fire({
        title: 'No shop selected',
        text: 'Reload and try again.',
      });
      return;
    }
    const response = await WarningMessage.fire({
      title: 'Delete game?',
      text: `This will remove "${game.name || 'Unnamed game'}" permanently.`,
      confirmButtonText: 'Delete',
    });
    if (!response.isConfirmed) return;
    try {
      await deleteDoc(doc(db, 'shops', shopId, 'games', game.id));
      Toast.fire({ title: 'Game deleted' });
    } catch (e) {
      console.error('Failed to delete game', e);
      ErrorMessage.fire({
        title: 'Delete failed',
        text: 'Please try again.',
      });
    }
  };

  return (
    <div className="card mt-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 style={{ margin: 0 }}>Games</h4>
            <small className="text-muted">Schedule activations for this store</small>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Add Game
          </button>
        </div>

        {loading && <p>Loading games…</p>}

        {!loading && games.length === 0 && (
          <p className="text-muted mb-0">No games scheduled yet.</p>
        )}

        {!loading &&
          games.map((game) => {
            const status = deriveStatus(game);
            return (
              <div
                key={game.id}
                className="border rounded p-3 mb-2 d-flex flex-wrap justify-content-between align-items-start"
              >
                <div>
                  <h5 style={{ marginBottom: 4 }}>{game.name || 'Untitled game'}</h5>
                  <p style={{ marginBottom: 4 }}>
                    {formatDate(game.startAt)} &mdash; {formatDate(game.endAt)}
                  </p>
                  <span className={`badge ${status.className}`}>{status.label}</span>
                </div>
                <div className="btn-group mt-2 mt-md-0">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => goToOrders(game)}>
                    View Orders
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => openEditModal(game)}>
                    Edit
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => deleteGame(game)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      <Modal isOpen={modalOpen} toggle={closeModal}>
        <ModalHeader toggle={closeModal}>{editingGame ? 'Edit Game' : 'Schedule Game'}</ModalHeader>
        <ModalBody>
          <div className="form-group">
            <label htmlFor="gameNameInput">Game Name</label>
            <input
              id="gameNameInput"
              className="form-control"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Opening Night Giveaway"
            />
          </div>
          <div className="form-group">
            <label>Start Time</label>
            <DatePicker
              showTimeInput
              dateFormat="MMM d, yyyy h:mm aa"
              selected={startAt}
              onChange={(date) => setStartAt(date)}
              isClearable
            />
          </div>
          <div className="form-group">
            <label>End Time</label>
            <DatePicker
              showTimeInput
              dateFormat="MMM d, yyyy h:mm aa"
              selected={endAt}
              onChange={(date) => setEndAt(date)}
              isClearable
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-light" onClick={closeModal} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editingGame ? 'Save Changes' : 'Create Game'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default ShopGames;
