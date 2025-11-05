// ShopViewer.jsx (detail-only)
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SideMenu from '../admin/SideMenu';
import TopMenu from '../admin/TopBar';
import ShopGames from './ShopGames';
import '../../styles/css/AdminMain.css';

import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    where,
    getAggregateFromServer,
    sum,
    count,
} from 'firebase/firestore';
import { db } from '../../base';

const fmtCurrency = (n) => `$${(Number(n || 0)).toFixed(2)}`;

function ShopViewer() {
    const { shopId } = useParams();
    const navigate = useNavigate();

    // Redirect to SetUpShop (list) if no shopId
    useEffect(() => {
        if (!shopId) navigate('/setupshop', { replace: true });
    }, [shopId, navigate]);

    // state for this single shop
    const [loading, setLoading] = useState(true);
    const [shop, setShop] = useState(null);
    const [money, setMoney] = useState({ ordersCount: 0, gmv: 0, gmvNet: 0, gross: 0, grossNet: 0 });

    const shopDocRef = useMemo(() => (shopId ? doc(db, 'shops', shopId) : null), [shopId]);

    // Live shop doc
    useEffect(() => {
        if (!shopDocRef) return;
        setLoading(true);
        const unsub = onSnapshot(
            shopDocRef,
            (snap) => {
                if (!snap.exists()) {
                    setShop(null);
                    setLoading(false);
                    // If shop doesn't exist, bounce back to list
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

    // Aggregates for orders + counts across all games
    useEffect(() => {
        if (!shopId) return;
        (async () => {
            try {
                const gamesSnap = await getDocs(collection(db, 'shops', shopId, 'games'));
                if (gamesSnap.empty) {
                    setMoney({ ordersCount: 0, subtotal: 0, gross: 0, gmvNet: 0, grossNet: 0 });
                    return;
                }

                const aggPromises = gamesSnap.docs.map((gameDoc) => {
                    const ordersCol = collection(db, 'shops', shopId, 'games', gameDoc.id, 'orders');
                    const paidOrdersQ = query(
                        ordersCol,
                        where('financialStatus', '==', 'PAID'),
                        where('cancelledAt', '==', null),
                        where('optIn', '==', true)
                    );
                    return getAggregateFromServer(paidOrdersQ, {
                        subtotal: sum('subtotal'),
                        gross: sum('total'),
                        ordersCount: count(),
                    });
                });

                const aggResults = await Promise.all(aggPromises);
                const totals = aggResults.reduce(
                    (acc, agg) => {
                        const data = agg.data();
                        acc.ordersCount += data.ordersCount || 0;
                        acc.subtotal += data.subtotal || 0;
                        acc.gross += data.gross || 0;
                        return acc;
                    },
                    { ordersCount: 0, subtotal: 0, gross: 0 }
                );

                setMoney((prev) => ({
                    ...prev,
                    ordersCount: totals.ordersCount,
                    subtotal: totals.subtotal,
                    gross: totals.gross,
                }));
            } catch (err) {
                console.error('Failed to aggregate orders', err);
                setMoney((prev) => ({ ...prev, ordersCount: 0, subtotal: 0, gross: 0 }));
            }
        })();
    }, [shopId]);

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
                                    <span style={{color: 'black'}} className={`badge ${shop.active ? 'badge-success' : 'badge-secondary'}`}>
                                        {shop.active ? 'Active' : 'Inactive'}
                                    </span>
                                </p>

                                <div className="row" style={{ marginTop: 20 }}>
                                    <div className="col-md-3">
                                        <div className="card text-center">
                                            <div className="card-body">
                                                <h5>Orders</h5>
                                                <p style={{ fontSize: 24, margin: 0 }}>{money.ordersCount}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card text-center"><div className="card-body">
                                            <h5>Subtotal</h5>
                                            <p style={{ fontSize: 24, margin: 0 }}>{fmtCurrency(money.subtotal)}</p>
                                            <small>Net: {fmtCurrency(money.gmvNet)}</small>
                                        </div></div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card text-center"><div className="card-body">
                                            <h5>Gross Collected</h5>
                                            <p style={{ fontSize: 24, margin: 0 }}>{fmtCurrency(money.gross)}</p>
                                            <small>Net: {fmtCurrency(money.grossNet)}</small>
                                        </div></div>
                                    </div>
                                </div>
                                <ShopGames shopId={shop.id} />
                            </>
                        )}

                        {!loading && !shop && <p>Shop not found.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ShopViewer;
