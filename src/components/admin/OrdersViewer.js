// ShopViewer.jsx (detail-only orders view) — with selection + "Grant credit"
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
} from 'firebase/firestore';
import { db } from '../../base';

const fmtCurrency = (n) => `$${(Number(n || 0)).toFixed(2)}`;
const fmtDate = (ts) => {
    if (!ts) return '';
    // supports Firestore Timestamp or ISO/string
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};

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
    const [orders, setOrders] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursorStack, setCursorStack] = useState([]); // for Prev
    const [lastDoc, setLastDoc] = useState(null);

    const baseOrdersCol = useMemo(() => {
        return shopId ? collection(db, 'shops', shopId, 'orders') : null;
    }, [shopId]);

    const makeQuery = useCallback(
        (cursor = null) => {
            if (!baseOrdersCol) return null;
            // NOTE: requires a composite index the first time; Firestore will give you a link.
            let qy = query(
                baseOrdersCol,
                where('optIn', '==', true),
                where('financialStatus', '==', 'PAID'),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );
            if (cursor) qy = query(qy, startAfter(cursor));
            return qy;
        },
        [baseOrdersCol]
    );

    const loadPage = useCallback(
        async (cursor = null, pushCursor = false) => {
            if (!shopId || !baseOrdersCol) return;
            setFetching(true);
            try {
                const qy = makeQuery(cursor);
                const snap = await getDocs(qy);
                const docs = snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d }));

                // preserve previous selection state if the same id appears on subsequent loads
                setOrders((prev) => {
                    const selectedMap = new Map(prev.filter(p => p._selected).map(p => [p.id, true]));
                    return docs.map(d => (selectedMap.has(d.id) ? { ...d, _selected: true } : d));
                });

                // pagination state
                const last = snap.docs[snap.docs.length - 1] || null;
                setLastDoc(last);
                setHasMore(!!last && snap.docs.length === PAGE_SIZE);
                if (pushCursor && cursor) {
                    setCursorStack((s) => [...s, cursor]);
                }
            } catch (e) {
                console.error('orders fetch error', e);
            } finally {
                setFetching(false);
            }
        },
        [shopId, baseOrdersCol, makeQuery]
    );

    useEffect(() => {
        // initial load
        setCursorStack([]);
        setLastDoc(null);
        if (shopId) loadPage(null, false);
    }, [shopId, loadPage]);

    const onNext = () => {
        if (hasMore && lastDoc) loadPage(lastDoc, true);
    };
    const onPrev = () => {
        const prev = cursorStack[cursorStack.length - 1] || null;
        if (prev === undefined) return; // nothing to do
        const newStack = cursorStack.slice(0, -1);
        setCursorStack(newStack);
        const prevPrev = newStack[newStack.length - 1] || null;
        loadPage(prevPrev, false);
    };

    // --- selection helpers ---
    const allOnPageSelected = orders.length > 0 && orders.every(o => !!o._selected);
    const anySelected = orders.some(o => !!o._selected);
    const selected = orders.filter(o => o._selected);

    // local preview only (server decides the real formula)
    const previewTotalSelectedSubtotal = selected.reduce(
        (sum, o) => sum + Number(o.currentSubtotal ?? o.subtotal ?? 0),
        0
    );

    const toggleSelectAllOnPage = (checked) => {
        setOrders(prev => prev.map(p => ({ ...p, _selected: !!checked })));
    };

    // --- grant credit action ---
    const [granting, setGranting] = useState(false);
    const onGrantCredit = async () => {
        if (!anySelected || !shopId) return;
        setGranting(true);
        try {
            const payload = selected.map(o => ({
                orderId: o.id,
                email: o.email || o.customerEmail || o.customer?.email || '',
                subtotal: Number(o.currentSubtotal ?? o.subtotal ?? 0),
                currencyCode: o.currencyCode || o.currentSubtotalCurrency || 'USD',
            }));
            const res = await fetch(`/api/credit-winners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: payload }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Failed to grant credit');
            alert(`Granted credit for ${json.processed} order(s).${json.failures?.length ? `\nFailures: ${json.failures.length}` : ''}`);
            // Clear selection on success
            setOrders(prev => prev.map(p => ({ ...p, _selected: false })));
        } catch (e) {
            console.error(e);
            alert(`Grant failed: ${e.message || String(e)}`);
        } finally {
            setGranting(false);
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
                                <p><strong>Domain:</strong> {shop.shopLink || shop.id}</p>
                                <p>
                                    <strong>Status:</strong>{' '}
                                    <span className={`badge ${shop.active ? 'badge-success' : 'badge-secondary'}`}>
                    {shop.active ? 'Active' : 'Inactive'}
                  </span>
                                </p>

                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h4 className="mb-0">Orders (opt-in, paid)</h4>
                                    <div>
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={onPrev}
                                            disabled={cursorStack.length === 0 || fetching}
                                            style={{ marginRight: 8 }}
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
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-end">Subtotal</th>
                                            <th style={{ whiteSpace: 'nowrap' }} className="text-end">Total</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {orders.length === 0 && !fetching && (
                                            <tr>
                                                <td colSpan={6} className="text-center text-muted">
                                                    No orders match this filter.
                                                </td>
                                            </tr>
                                        )}
                                        {orders.map((o) => {
                                            // Try common shapes: email, customer.email, customerEmail
                                            const email = o.email || o.customerEmail || o.customer?.email || '';
                                            // Money: prefer currentSubtotal/currentTotal → fallback to subtotal/total
                                            const sub = (o.currentSubtotal ?? o.subtotal ?? 0);
                                            const tot = (o.currentTotal ?? o.total ?? 0);
                                            // CreatedAt: prefer createdAt, fallback to orderCreatedAt
                                            const created = o.createdAt || o.orderCreatedAt || null;
                                            // Name/number/id
                                            const orderLabel = o.name || o.orderName || o.id;

                                            return (
                                                <tr key={o.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!o._selected}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setOrders(prev =>
                                                                    prev.map(p => (p.id === o.id ? { ...p, _selected: checked } : p))
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
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
                                    <button
                                        className="btn btn-primary"
                                        disabled={!anySelected || granting}
                                        onClick={onGrantCredit}
                                        title={anySelected ? 'Grant store credit to selected orders' : 'Select at least one order'}
                                    >
                                        {granting ? 'Granting…' : 'Grant credit'}
                                    </button>

                                    <div className="ms-auto d-flex align-items-center">
                                        <small className="text-muted me-3">
                                            Selected: {selected.length} • Preview subtotal sum: {fmtCurrency(previewTotalSelectedSubtotal)}
                                        </small>
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
