// ShopViewer.jsx (detail-only orders view) — tabbed (Active / Excluded), soft-exclude + restore
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SideMenu from '../admin/SideMenu';
import TopMenu from '../admin/TopBar';
import '../../styles/css/AdminMain.css';

import {
    collection,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    startAfter,
    updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../../base';

const fmtCurrency = (n) => `$${(Number(n || 0)).toFixed(2)}`;
const fmtDate = (ts) => {
    if (!ts) return '';
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};

// Simple chunker for batching POSTs
const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

// Helpers to build ISO day boundaries (createdAt is stored as ISO string)
const toISOStartOfDay = (ymd) => (ymd ? new Date(`${ymd}T00:00:00.000Z`).toISOString() : null);
const toISOEndOfDay = (ymd) => (ymd ? new Date(`${ymd}T23:59:59.999Z`).toISOString() : null);

const SHOPIFY_SERVICE_URL = (process.env.REACT_APP_SHOPIFY_SERVICE_URL || '').replace(/\/$/, '');
const CREDIT_WINNERS_URL = SHOPIFY_SERVICE_URL ? `${SHOPIFY_SERVICE_URL}/api/credit-winners` : '/api/credit-winners';

async function getIdTokenOrThrow() {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in to perform this action.');
    return user.getIdToken();
}

function OrdersViewer() {
    const { shopId } = useParams();
    const navigate = useNavigate();

    // Redirect to SetUpShop (list) if no shopId
    useEffect(() => {
        if (!shopId) navigate('/setupshop', { replace: true });
    }, [shopId, navigate]);

    // Single shop header (name/status)
    const [loading, setLoading] = useState(true);
    const [shop, setShop] = useState(null);

    const shopDocRef = useMemo(() => (shopId ? doc(db, 'shops', shopId) : null), [shopId]);
    useEffect(() => {
        if (!shopDocRef) return;
        setLoading(true);
        const unsub = onSnapshot(
            shopDocRef,
            (snap) => {
                if (!snap.exists()) {
                    setShop(null);
                    setLoading(false);
                    navigate('/setupshop', { replace: true });
                    return;
                }
                setShop({ id: snap.id, ...snap.data() });
                setLoading(false);
            },
            () => setLoading(false)
        );
        return () => unsub();
    }, [shopDocRef, navigate]);

    // -------- Orders table (optIn == true, financialStatus == 'PAID') --------
    const PAGE_SIZE = 50;
    const API_BATCH = 75; // batch size for POST /api/credit-winners

    const [orders, setOrders] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursorStack, setCursorStack] = useState([]); // for Prev
    const [lastDoc, setLastDoc] = useState(null);

    const baseOrdersCol = useMemo(() => {
        return shopId ? collection(db, 'shops', shopId, 'orders') : null;
    }, [shopId]);

    // Tabs: Active vs Excluded
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'excluded'

    // Date filters
    const [fromDate, setFromDate] = useState(''); // 'YYYY-MM-DD'
    const [toDate, setToDate] = useState(''); // 'YYYY-MM-DD'

    const makeQuery = useCallback(
        (cursor = null) => {
            if (!baseOrdersCol) return null;

            let qy = query(
                baseOrdersCol,
                where('optIn', '==', true),
                where('financialStatus', '==', 'PAID'),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );

            // Excluded tab narrows on server; Active is filtered client-side to include "missing" excluded field
            if (activeTab === 'excluded') {
                qy = query(qy, where('excluded', '==', true));
            }

            // Date range on ISO `createdAt`
            const gte = toISOStartOfDay(fromDate);
            const lte = toISOEndOfDay(toDate);
            if (gte) qy = query(qy, where('createdAt', '>=', gte));
            if (lte) qy = query(qy, where('createdAt', '<=', lte));

            if (cursor) qy = query(qy, startAfter(cursor));
            return qy;
        },
        [baseOrdersCol, fromDate, toDate, activeTab]
    );

    const loadPage = useCallback(
        async (cursor = null, pushCursor = false) => {
            if (!shopId || !baseOrdersCol) return;
            setFetching(true);
            try {
                const qy = makeQuery(cursor);
                const snap = await getDocs(qy);
                const docs = snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d }));

                // Client-side filter for Active tab to include docs without `excluded` set
                const filtered = activeTab === 'active' ? docs.filter((d) => d.excluded !== true) : docs;

                // Preserve previous selection (if an item re-appears)
                setOrders((prev) => {
                    const selectedMap = new Map(prev.filter((p) => p._selected).map((p) => [p.id, true]));
                    return filtered.map((d) => (selectedMap.has(d.id) ? { ...d, _selected: true } : d));
                });

                const last = snap.docs[snap.docs.length - 1] || null;
                setLastDoc(last);
                setHasMore(!!last && snap.docs.length === PAGE_SIZE);
                if (pushCursor && cursor) setCursorStack((s) => [...s, cursor]);
            } catch (e) {
                console.error('orders fetch error', e);
            } finally {
                setFetching(false);
            }
        },
        [shopId, baseOrdersCol, makeQuery, activeTab]
    );

    // Initial load & when shop/tab changes
    useEffect(() => {
        setCursorStack([]);
        setLastDoc(null);
        if (shopId) loadPage(null, false);
    }, [shopId, activeTab, loadPage]);

    // Reset to page 1 when date filters change
    useEffect(() => {
        setCursorStack([]);
        setLastDoc(null);
        if (shopId) loadPage(null, false);
    }, [shopId, fromDate, toDate, loadPage]);

    const onNext = () => {
        if (hasMore && lastDoc) loadPage(lastDoc, true);
    };
    const onPrev = () => {
        const prev = cursorStack[cursorStack.length - 1] || null;
        if (prev === undefined) return;
        const newStack = cursorStack.slice(0, -1);
        setCursorStack(newStack);
        const prevPrev = newStack[newStack.length - 1] || null;
        loadPage(prevPrev, false);
    };

    // --- selection helpers (exclude credited and excluded from selection) ---
    const selectable = orders.filter((o) => !o.credited && !o.excluded);
    const allOnPageSelected = selectable.length > 0 && selectable.every((o) => !!o._selected);
    const selected = orders.filter((o) => o._selected && !o.credited && !o.excluded);
    const anySelected = selected.length > 0;

    const previewTotalSelectedSubtotal = selected.reduce(
        (sum, o) => sum + Number(o.currentSubtotal ?? o.subtotal ?? 0),
        0
    );

    const toggleSelectAllOnPage = (checked) => {
        setOrders((prev) => prev.map((p) => (p.credited || p.excluded ? p : { ...p, _selected: !!checked })));
    };

    // --- grant credit for selected (optimistic mark + refresh) ---
    const [granting, setGranting] = useState(false);
    const onGrantCredit = async () => {
        if (!anySelected || !shopId) return;
        setGranting(true);
        const ids = new Set(selected.map((o) => o.id));

        // optimistic: mark selected as credited in UI
        setOrders((prev) =>
            prev.map((p) => (ids.has(p.id) ? { ...p, credited: true, _selected: false } : p))
        );

        try {
            const payload = selected.map((o) => ({
                orderId: o.id,
                email: o.email || o.customerEmail || o.customer?.email || '',
                subtotal: Number(o.currentSubtotal ?? o.subtotal ?? 0),
                currencyCode: o.currencyCode || o.currentSubtotalCurrency || o.currency || 'USD',
            }));

            const uniqueCustomers = new Set(
                selected.map(o => o.customerId || o.customer?.id).filter(Boolean)
            );
            const customerIdSent = uniqueCustomers.size === 1 ? [...uniqueCustomers][0] : undefined;

            const idToken = await getIdTokenOrThrow();

            const res = await fetch(CREDIT_WINNERS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`
                },
                body: JSON.stringify(
                    customerIdSent
                        ? { customerIdSent, orders: payload, shopId }
                        : { orders: payload, shopId }
                ),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Failed to grant credit');
            alert(
                `Granted credit for ${json.processed} order(s).${
                    json.failures?.length ? `\nFailures: ${json.failures.length}` : ''
                }`
            );
        } catch (e) {
            // rollback optimistic changes if API failed
            setOrders((prev) =>
                prev.map((p) => (ids.has(p.id) ? { ...p, credited: false } : p))
            );
            console.error(e);
            alert(`Grant failed: ${e.message || String(e)}`);
        } finally {
            // refresh to reflect server truth (handles partial failures)
            setCursorStack([]);
            setLastDoc(null);
            loadPage(null, false);
            setGranting(false);
        }
    };

    // --- grant credit for ALL (non-credited, non-excluded) respecting current date filters ---
    const [grantingAll, setGrantingAll] = useState(false);
    const [grantAllProgress, setGrantAllProgress] = useState({ scanned: 0, sent: 0, failures: 0 });

    const fetchAllEligibleOrders = useCallback(async () => {
        const all = [];
        let cursor = null;
        const MAX_PAGES = 2000; // safety

        for (let i = 0; i < MAX_PAGES; i++) {
            const qy = makeQuery(cursor);
            const snap = await getDocs(qy);
            const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            all.push(...(activeTab === 'active' ? docs.filter((d) => d.excluded !== true) : docs));
            const last = snap.docs[snap.docs.length - 1] || null;
            if (!last || snap.docs.length < PAGE_SIZE) break;
            cursor = last;
            setGrantAllProgress((p) => ({ ...p, scanned: all.length }));
        }
        return all.filter((o) => o.credited !== true && o.excluded !== true);
    }, [makeQuery, activeTab]);

    const onGrantAll = async () => {
        if (!shopId || grantingAll || activeTab !== 'active') return;
        const confirmMsg =
            'This will credit ALL non-credited, non-excluded, opt-in, PAID orders for this shop (within the current date filters).\n\nProceed?';
        if (!window.confirm(confirmMsg)) return;

        setGrantingAll(true);
        setGrantAllProgress({ scanned: 0, sent: 0, failures: 0 });

        try {
            const allEligible = await fetchAllEligibleOrders();
            if (allEligible.length === 0) {
                alert('No eligible non-credited orders found.');
                setGrantingAll(false);
                return;
            }

            // optimistic: mark visible page items that are in the eligible set as credited
            const eligibleIds = new Set(allEligible.map((o) => o.id));
            setOrders((prev) =>
                prev.map((p) => (eligibleIds.has(p.id) ? { ...p, credited: true, _selected: false } : p))
            );

            const payloads = allEligible.map((o) => ({
                orderId: o.id,
                email: o.email || o.customerEmail || o.customer?.email || '',
                subtotal: Number(o.currentSubtotal ?? o.subtotal ?? 0),
                currencyCode: o.currencyCode || o.currentSubtotalCurrency || o.currency || 'USD',
            }));

            let totalProcessed = 0;
            let totalFailures = 0;
            const idToken = await getIdTokenOrThrow();

            for (const batch of chunk(payloads, API_BATCH)) {
                const res = await fetch(CREDIT_WINNERS_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ orders: batch, shopId }),
                });
                const json = await res.json();
                if (!res.ok) {
                    totalFailures += batch.length;
                } else {
                    totalProcessed += Number(json?.processed || 0);
                    totalFailures += Number(json?.failures?.length || 0);
                }
                setGrantAllProgress((p) => ({ ...p, sent: totalProcessed, failures: totalFailures }));
            }

            alert(`Done.\nProcessed: ${totalProcessed}\nFailures: ${totalFailures}`);
        } catch (e) {
            console.error(e);
            alert(`Grant-all failed: ${e.message || String(e)}`);
        } finally {
            // refresh to reflect server truth and clear any incorrect optimistic marks
            setCursorStack([]);
            setLastDoc(null);
            loadPage(null, false);
            setGrantingAll(false);
        }
    };

    // --- Soft exclude / restore (optimistic) ---
    const [deletingId, setDeletingId] = useState(null);
    const [deletingBulk, setDeletingBulk] = useState(false);

    const onExcludeOrder = async (o) => {
        if (!shopId || !o?.id) return;
        if (o.credited) {
            alert('This order was already credited and cannot be excluded here.');
            return;
        }
        const label = o.name || o.orderName || o.id;
        if (!window.confirm(`Exclude order ${label} from SQWAD crediting?`)) return;

        setDeletingId(o.id);

        // OPTIMISTIC: mark excluded AND remove from Active tab immediately
        const now = new Date().toISOString();
        const prev = o;

        setOrders((prevOrders) => {
            const next = prevOrders.map((p) =>
                p.id === o.id ? { ...p, excluded: true, excludedAt: now, _selected: false } : p
            );
            // If we're on the Active tab, hide it right away
            return (activeTab === 'active') ? next.filter(p => p.id !== o.id) : next;
        });

        try {
            await updateDoc(doc(db, 'shops', shopId, 'orders', o.id), {
                excluded: true,
                excludedAt: now,
            });
        } catch (e) {
            // ROLLBACK
            setOrders((prevOrders) => {
                const rolled = prevOrders.map((p) =>
                    p.id === prev.id ? { ...p, excluded: prev.excluded, excludedAt: prev.excludedAt } : p
                );
                // If we removed it from the Active tab list, add it back
                const exists = rolled.some(p => p.id === prev.id);
                return exists ? rolled : [prev, ...rolled];
            });
            alert(`Exclude failed: ${e.message || String(e)}`);
        } finally {
            setDeletingId(null);
        }
    };

    const onRestoreOrder = async (o) => {
        if (!shopId || !o?.id) return;

        setDeletingId(o.id);
        const prev = o;

        // OPTIMISTIC: mark restored AND remove from Excluded tab immediately
        setOrders((prevOrders) => {
            const next = prevOrders.map((p) =>
                p.id === o.id ? { ...p, excluded: false, excludedAt: null } : p
            );
            return (activeTab === 'excluded') ? next.filter(p => p.id !== o.id) : next;
        });

        try {
            await updateDoc(doc(db, 'shops', shopId, 'orders', o.id), {
                excluded: false,
                excludedAt: null,
            });
        } catch (e) {
            // ROLLBACK
            setOrders((prevOrders) =>
                prevOrders.map((p) =>
                    p.id === prev.id ? { ...p, excluded: prev.excluded, excludedAt: prev.excludedAt } : p
                )
            );
            alert(`Restore failed: ${e.message || String(e)}`);
        } finally {
            setDeletingId(null);
        }
    };

    const onExcludeSelected = async () => {
        if (!shopId || selected.length === 0) return;
        const count = selected.length;
        if (!window.confirm(`Exclude ${count} selected order(s) from SQWAD crediting?`)) return;

        setDeletingBulk(true);
        const now = new Date().toISOString();
        const ids = new Set(selected.map((o) => o.id));

        // OPTIMISTIC
        setOrders((prev) => {
            let next = prev.map((p) =>
                ids.has(p.id) ? { ...p, excluded: true, excludedAt: now, _selected: false } : p
            );
            // Active tab: remove excluded rows immediately
            if (activeTab === 'active') next = next.filter((p) => !ids.has(p.id));
            return next;
        });

        try {
            for (const group of chunk(selected, 50)) {
                await Promise.all(
                    group.map((o) =>
                        updateDoc(doc(db, 'shops', shopId, 'orders', o.id), {
                            excluded: true,
                            excludedAt: now,
                        })
                    )
                );
            }
        } catch (e) {
            console.error(e);
            alert(`Bulk exclude failed: ${e.message || String(e)}`);
            // Hard refresh to reconcile any partial successes
            setCursorStack([]);
            setLastDoc(null);
            await loadPage(null, false);
        } finally {
            setDeletingBulk(false);
        }
    };

    const onRestoreSelected = async () => {
        const toRestore = orders.filter((o) => o._selected && o.excluded === true);
        if (!shopId || toRestore.length === 0) return;
        if (!window.confirm(`Restore ${toRestore.length} selected order(s) to Active?`)) return;

        setDeletingBulk(true);
        const ids = new Set(toRestore.map((o) => o.id));

        // OPTIMISTIC
        setOrders((prev) => {
            let next = prev.map((p) =>
                ids.has(p.id) ? { ...p, excluded: false, excludedAt: null, _selected: false } : p
            );
            // Excluded tab: remove restored rows immediately
            if (activeTab === 'excluded') next = next.filter((p) => !ids.has(p.id));
            return next;
        });

        try {
            for (const group of chunk(toRestore, 50)) {
                await Promise.all(
                    group.map((o) =>
                        updateDoc(doc(db, 'shops', shopId, 'orders', o.id), {
                            excluded: false,
                            excludedAt: null,
                        })
                    )
                );
            }
        } catch (e) {
            console.error(e);
            alert(`Bulk restore failed: ${e.message || String(e)}`);
            setCursorStack([]);
            setLastDoc(null);
            await loadPage(null, false);
        } finally {
            setDeletingBulk(false);
        }
    };

    return (
        <div className="admin-wrapper">
            <div className="loading-screen" style={{ display: loading ? 'block' : 'none' }} />
            <SideMenu />
            <TopMenu />

            <div className="admin-main-panel">
                <div className="card">
                    <div className="card-body">
                        <button className="btn btn-light mb-3" onClick={() => navigate('/shops')}>
                            ← Back to Shops
                        </button>

                        {shop && (
                            <>
                                <h3 style={{ marginTop: 0 }}>{shop.shopName}</h3>
                                <p>
                                    <strong>Domain:</strong> {shop.shopLink || shop.id}
                                </p>
                                <p>
                                    <strong>Status:</strong>{' '}
                                    <span className={`badge ${shop.active ? 'badge-success' : 'badge-secondary'}`}>
                    {shop.active ? 'Active' : 'Inactive'}
                  </span>
                                </p>

                                {/* Tabs */}
                                <div className="d-flex align-items-center mb-3">
                                    <ul className="nav nav-tabs">
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveTab('active');
                                                    setCursorStack([]);
                                                    setLastDoc(null);
                                                    loadPage(null, false);
                                                }}
                                            >
                                                Active
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${activeTab === 'excluded' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveTab('excluded');
                                                    setCursorStack([]);
                                                    setLastDoc(null);
                                                    loadPage(null, false);
                                                }}
                                            >
                                                Excluded
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                {/* Date filter + pager */}
                                <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
                                    <div className="me-3">
                                        <label className="form-label mb-1">
                                            <strong>From</strong>
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            max={toDate || undefined}
                                        />
                                    </div>
                                    <div className="me-3">
                                        <label className="form-label mb-1">
                                            <strong>To</strong>
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            min={fromDate || undefined}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => {
                                            setFromDate('');
                                            setToDate('');
                                        }}
                                        title="Clear date filters"
                                    >
                                        Clear dates
                                    </button>

                                    <div className="ms-auto">
                                        <button
                                            className="btn btn-outline-secondary btn-sm me-2"
                                            onClick={onPrev}
                                            disabled={cursorStack.length === 0 || fetching}
                                        >
                                            Prev
                                        </button>
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={onNext}
                                            disabled={!hasMore || fetching}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="table-responsive">
                                    <table className="table table-striped table-hover">
                                        <thead>
                                        <tr>
                                            <th style={{ width: 36 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={allOnPageSelected}
                                                    onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                                                    aria-label="Select all on this page"
                                                />
                                            </th>
                                            <th style={{ whiteSpace: 'nowrap' }}>Created</th>
                                            <th style={{ whiteSpace: 'nowrap' }}>Order</th>
                                            <th style={{ whiteSpace: 'nowrap' }}>Email</th>
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-end">
                                                Subtotal
                                            </th>
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-end">
                                                Total
                                            </th>
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-center">
                                                Credited
                                            </th>
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-center">
                                                Excluded
                                            </th>
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-center">
                                                Cancelled
                                            </th>
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-end">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {orders.length === 0 && !fetching && (
                                            <tr>
                                                <td colSpan={10} className="text-center text-muted">
                                                    No orders match this filter.
                                                </td>
                                            </tr>
                                        )}
                                        {orders.map((o) => {
                                            const email = o.email || o.customerEmail || o.customer?.email || '';
                                            const sub = o.currentSubtotal ?? o.subtotal ?? 0;
                                            const tot = o.currentTotal ?? o.total ?? 0;
                                            const created = o.createdAt || o.orderCreatedAt || null;
                                            const orderLabel = o.name || o.orderName || o.id;

                                            return (
                                                <tr
                                                    key={o.id}
                                                    className={
                                                        o.excluded
                                                            ? 'text-muted row-cancelled'
                                                            : o.credited
                                                                ? 'text-muted row-credited'
                                                                : ''
                                                    }
                                                >
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!o._selected}
                                                            disabled={!!o.credited || !!o.excluded}
                                                            title={
                                                                o.credited
                                                                    ? 'Already credited'
                                                                    : o.excluded
                                                                        ? 'Excluded'
                                                                        : `Select order ${orderLabel}`
                                                            }
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                if (o.credited || o.excluded) return;
                                                                setOrders((prev) =>
                                                                    prev.map((p) => (p.id === o.id ? { ...p, _selected: checked } : p))
                                                                );
                                                            }}
                                                            aria-label={`Select order ${orderLabel}`}
                                                        />
                                                    </td>
                                                    <td>{fmtDate(created)}</td>
                                                    <td>{orderLabel}</td>
                                                    <td>{email}</td>
                                                    <td className="text-end">{fmtCurrency(sub)}</td>
                                                    <td className="text-end">{fmtCurrency(tot)}</td>
                                                    <td className="text-center avoid-strike">
                                                        {o.credited ? (
                                                            <span style={{ color: 'black' }} className="badge badge-success">
                                  Yes
                                </span>
                                                        ) : (
                                                            <span style={{ color: 'black' }} className="badge badge-secondary">
                                  No
                                </span>
                                                        )}
                                                    </td>
                                                    <td className="text-center avoid-strike">
                                                        {o.excluded ? (
                                                            <span
                                                                style={{ color: 'black' }}
                                                                className="badge badge-warning"
                                                            >
                                  Yes
                                </span>
                                                        ) : (
                                                            <span style={{ color: 'black' }} className="badge badge-secondary">
                                  No
                                </span>
                                                        )}
                                                    </td>
                                                    <td className="text-center avoid-strike">
                                                        {o.cancelledAt ? (
                                                            <span style={{ color: 'black' }} className="badge badge-danger">
                                  Yes
                                </span>
                                                        ) : (
                                                            <span style={{ color: 'black' }} className="badge badge-secondary">
                                  No
                                </span>
                                                        )}
                                                    </td>
                                                    <td className="text-end avoid-strike">
                                                        {activeTab === 'excluded' ? (
                                                            <button
                                                                className="btn btn-outline-secondary btn-sm"
                                                                disabled={deletingId === o.id}
                                                                title="Restore to Active list"
                                                                onClick={() => onRestoreOrder(o)}
                                                            >
                                                                {deletingId === o.id ? 'Restoring…' : 'Restore'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="btn btn-outline-danger btn-sm"
                                                                disabled={!!o.credited || deletingId === o.id}
                                                                title={
                                                                    o.credited
                                                                        ? 'Already credited — cannot exclude'
                                                                        : 'Exclude from crediting'
                                                                }
                                                                onClick={() => onExcludeOrder(o)}
                                                            >
                                                                {deletingId === o.id ? 'Excluding…' : 'Exclude'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer actions */}
                                <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
                                    {activeTab === 'active' && (
                                        <>
                                            <button
                                                className="btn btn-primary"
                                                disabled={!anySelected || granting}
                                                onClick={onGrantCredit}
                                                title={
                                                    anySelected
                                                        ? 'Grant store credit to selected orders'
                                                        : 'Select at least one order'
                                                }
                                            >
                                                {granting ? 'Granting…' : 'Grant credit'}
                                            </button>

                                            <button
                                                className="btn btn-outline-danger"
                                                disabled={selected.length === 0 || deletingBulk}
                                                onClick={onExcludeSelected}
                                                title={
                                                    selected.length
                                                        ? 'Exclude all selected orders from crediting'
                                                        : 'Select at least one order'
                                                }
                                                style={{ marginLeft: 8 }}
                                            >
                                                {deletingBulk ? 'Excluding selected…' : 'Exclude selected'}
                                            </button>

                                            <button
                                                className="btn btn-danger"
                                                disabled={grantingAll || fetching}
                                                onClick={onGrantAll}
                                                title="Grant store credit to all non-credited, non-excluded orders (respects date filters)"
                                                style={{ marginLeft: 8 }}
                                            >
                                                {grantingAll
                                                    ? `Granting ALL… scanned ${grantAllProgress.scanned} / sent ${grantAllProgress.sent} (failures ${grantAllProgress.failures})`
                                                    : 'Grant credit to ALL (non-credited)'}
                                            </button>
                                        </>
                                    )}

                                    {activeTab === 'excluded' && (
                                        <button
                                            className="btn btn-outline-secondary"
                                            disabled={orders.filter((o) => o._selected && o.excluded === true).length === 0 || deletingBulk}
                                            onClick={onRestoreSelected}
                                            title="Restore selected orders to Active"
                                        >
                                            {deletingBulk ? 'Restoring…' : 'Restore selected'}
                                        </button>
                                    )}

                                    <div className="ms-auto d-flex align-items-center">
                                        {activeTab === 'active' && (
                                            <small className="text-muted me-3">
                                                Selected: {selected.length} • Preview subtotal sum: {fmtCurrency(previewTotalSelectedSubtotal)}
                                            </small>
                                        )}
                                        <small className="text-muted">
                                            Showing {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                                        </small>
                                    </div>
                                </div>
                            </>
                        )}

                        {!loading && !shop && <p>Shop not found.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrdersViewer;
