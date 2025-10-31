// SetUpShop.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideMenu from '../admin/SideMenu';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import TopMenu from '../admin/TopBar';
import { Toast, ErrorMessage, WarningMessage } from '../utils/HelpfulFunction';
import '../../styles/css/AdminMain.css';

import {
    collection,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../base';

const SHOPS_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/; // e.g. sqwad-test-store-plus.myshopify.com

function normalizeDomain(input) {
    return (input || '').trim().toLowerCase();
}

function assertValidDomainOrThrow(domain) {
    if (!domain) {
        throw new Error('Please enter a Shopify domain (e.g., sqwad-test-store-plus.myshopify.com).');
    }
    if (domain.includes('/')) {
        // Firestore doc IDs cannot contain '/'.
        throw new Error('Domain must not include slashes.');
    }
    if (!SHOPS_REGEX.test(domain)) {
        throw new Error('Domain must match *.myshopify.com and use only lowercase letters, digits, and hyphens.');
    }
}

function SetUpShop() {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);

    // modal + form
    const [modal, setModal] = useState(false);
    const [editingShop, setEditingShop] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null); // whole doc (including id)
    const [shopName, setShopName] = useState('');
    const [shopLink, setShopLink] = useState(''); // this will be (and generate) the doc ID
    const [active, setActive] = useState(true);

    const shopsColRef = collection(db, 'shops');
    const navigate = useNavigate();

    // realtime Firestore listener
    useEffect(() => {
        const q = query(shopsColRef, orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(
            q,
            (snap) => {
                setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error(err);
                setLoading(false);
                ErrorMessage.fire({
                    title: 'Could not load shops',
                    text: 'Try reloading. If it persists, please log out/in.',
                });
            }
        );
        return () => unsub();
    }, [shopsColRef]);

    const resetForm = () => {
        setEditingShop(false);
        setSelectedShop(null);
        setShopName('');
        setShopLink('');
        setActive(true);
    };

    const toggle = useCallback(() => {
        setModal((prev) => !prev);
        if (modal) resetForm();
    }, [modal]);

    const openCreate = useCallback(() => {
        resetForm();
        setModal(true);
    }, []);

    const createOrUpdateShop = useCallback(async () => {
        const name = (shopName || '').trim();
        const rawDomain = normalizeDomain(shopLink);

        if (!name) {
            ErrorMessage.fire({ title: 'Missing Info', text: 'Please enter a shop name.' });
            return;
        }
        try {
            assertValidDomainOrThrow(rawDomain);
        } catch (e) {
            ErrorMessage.fire({ title: 'Invalid Domain', text: e.message });
            return;
        }

        try {
            if (editingShop && selectedShop?.id) {
                const oldId = selectedShop.id; // old domain id
                if (oldId === rawDomain) {
                    // Same ID: simple update
                    await updateDoc(doc(shopsColRef, oldId), {
                        shopName: name,
                        shopLink: rawDomain,
                        updatedAt: serverTimestamp(),
                        active
                    });
                    Toast.fire({ title: 'Shop updated!' });
                } else {
                    // Domain changed => new doc with new ID, then delete the old one
                    const oldDocRef = doc(shopsColRef, oldId);
                    const oldSnap = await getDoc(oldDocRef);
                    if (!oldSnap.exists()) {
                        // If somehow missing, just create the new one
                        await setDoc(doc(shopsColRef, rawDomain), {
                            shopName: name,
                            shopLink: rawDomain,
                            active,
                            createdAt: serverTimestamp(),
                        });
                        Toast.fire({ title: 'Shop saved under new domain.' });
                    } else {
                        const oldData = oldSnap.data() || {};
                        // Write new doc (copy old fields but override name/link, timestamps)
                        await setDoc(doc(shopsColRef, rawDomain), {
                            ...oldData,
                            shopName: name,
                            shopLink: rawDomain,
                            createdAt: oldData.createdAt || serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            active
                        });
                        // Delete the old doc
                        await deleteDoc(oldDocRef);
                        Toast.fire({ title: 'Domain updated and shop moved.' });
                    }
                }
            } else {
                // Create new doc with ID = domain
                const newRef = doc(shopsColRef, rawDomain);
                const existing = await getDoc(newRef);
                if (existing.exists()) {
                    ErrorMessage.fire({
                        title: 'Already Exists',
                        text: 'A shop with this domain already exists.',
                    });
                    return;
                }
                await setDoc(newRef, {
                    shopName: name,
                    shopLink: rawDomain,
                    createdAt: serverTimestamp(),
                });
                Toast.fire({ title: 'Shop created!' });
            }

            setModal(false);
            resetForm();
        } catch (e) {
            console.error(e);
            ErrorMessage.fire({
                title: 'There was an error!',
                text: 'Try again, and if the problem persists, try logging out and back in.',
            });
        }
    }, [shopName, shopLink, editingShop, selectedShop, shopsColRef]);

    const onEditShop = useCallback(
        (index) => {
            const s = shops[index];
            if (!s) {
                ErrorMessage.fire({ title: 'Oh uh!', text: 'Refresh the page and try again!' });
                return;
            }
            setActive(typeof s.active === 'boolean' ? s.active : true);
            setEditingShop(true);
            setSelectedShop(s);
            setShopName(s.shopName || '');
            setShopLink(s.shopLink || s.id || ''); // prefer field, fallback to id
            setModal(true);
        },
        [shops]
    );

    const onDeleteShop = useCallback(
        async (index) => {
            const s = shops[index];
            if (!s) return;

            const response = await WarningMessage.fire({
                title: 'Delete Shop?',
                text: 'Are you sure? Deleting a shop will remove it from the system.',
                confirmButtonText: 'Delete',
            });
            if (!response || !response.value) return;

            try {
                await deleteDoc(doc(shopsColRef, s.id));
                Toast.fire({ title: 'Deleted!' });
            } catch (e) {
                console.error(e);
                ErrorMessage.fire({
                    title: 'There was some error!',
                    text: 'Try again, and if the problem persists, try logging out and back in.',
                });
            }
        },
        [shops, shopsColRef]
    );

    // Duplicate -> open prefilled create modal (user must enter a new valid domain)
    const onDuplicateShop = useCallback(
        (index) => {
            const s = shops[index];
            if (!s) return;
            setEditingShop(false);
            setSelectedShop(null);
            setShopName(`${s.shopName || 'Shop'} (copy)`);
            setShopLink(''); // force user to enter a new valid *.myshopify.com
            setModal(true);
            setActive(typeof s.active === 'boolean' ? s.active : true);
        },
        [shops]
    );

    const toggleActiveInline = useCallback(async (shop) => {
        try {
            await updateDoc(doc(shopsColRef, shop.id), {
                active: !shop.active,
                    updatedAt: serverTimestamp(),
            });
            Toast.fire({ title: `Shop ${shop.active ? 'disabled' : 'enabled'}!` });
        } catch (e) {
            console.error(e);
            ErrorMessage.fire({ title: 'Error', text: 'Could not update active state.' });
        }
    }, [shopsColRef]);

    const goToShop = useCallback((shopOrIndex) => {
        const s = typeof shopOrIndex === 'number' ? shops[shopOrIndex] : shopOrIndex;
        if (!s) {
            ErrorMessage.fire({ title: 'Not found', text: 'That shop could not be loaded.' });
            return;
        }
        const id = s.id || (s.shopLink ?? '').trim().toLowerCase();
        if (!id) {
            ErrorMessage.fire({ title: 'Missing id', text: 'Shop is missing an id/domain.' });
            return;
        }
        navigate(`/shops/${encodeURIComponent(id)}`);
    }, [navigate, shops]);

    return (
        <div className="admin-wrapper">
            <div className="loading-screen" style={{ display: loading ? 'block' : 'none' }} />

            <SideMenu />
            <TopMenu />

            <div className="admin-main-panel">
                <div className="card">
                    <div className="card-body">
                        <p className="admin-header-text" style={{ marginBottom: 0 }}>Shops</p>
                        <p className="admin-subheader-text">These are shops in the system</p>
                        <button
                            className="btn btn-primary btn-lg create-prize-button"
                            style={{ fontSize: 20, marginLeft: 20 }}
                            onClick={openCreate}
                        >
                            Add Shop
                        </button>

                        <div className="admin-grid-container four-columns" style={{ marginTop: 20 }}>
                            {shops.map((s, i) => (
                                <div key={s.id || i} className="card">
                                    <div className="card-body" align="center">
                                        <p style={{ marginTop: 5, fontWeight: 600 }}>{s.shopName}</p>
                                        <p style={{ marginTop: 5 }}>{s.shopLink || s.id}</p>
                                        <p style={{ marginTop: 5, color: "black" }}>
                                            Status:&nbsp;
                                            <span style={{color: 'black'}} className={`badge ${s.active ? 'badge-success' : 'badge-secondary'}`}>
                                                {s.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>

                                        <button
                                            className="btn btn-primary btn-lg edit-button"
                                            style={{ marginRight: 5, marginBottom: 10 }}
                                            onClick={() => onEditShop(i)}
                                        >
                                            <span className="fa fa-ellipsis-v" /> Edit
                                        </button>
                                        <button
                                            className="btn btn-primary btn-lg delete-button"
                                            style={{ marginBottom: 10 }}
                                            onClick={() => onDeleteShop(i)}
                                        >
                                            <span className="fa fa-trash-o" /> Delete
                                        </button>
                                        <div className="row">
                                            <div className="col-lg-12">
                                                <button
                                                    className="btn btn-primary btn-lg"
                                                    style={{ marginRight: 5, marginBottom: 10 }}
                                                    onClick={() => onDuplicateShop(i)}
                                                >
                                                    <span className="fa fa-copy" /> Duplicate
                                                </button>
                                                <button
                                                    className="btn btn-outline-primary btn-lg"
                                                    style={{ marginLeft: 5, marginBottom: 10 }}
                                                    onClick={() => toggleActiveInline(s)}
                                                >
                                                    {s.active ? 'Disable' : 'Enable'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <button
                                                className="btn btn-success btn-lg"
                                                style={{ marginRight: 5, marginBottom: 10 }}
                                                onClick={() => goToShop(i)}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            <Modal isOpen={modal} toggle={toggle} style={{ width: '90%' }} id="myModal">
                <ModalHeader toggle={toggle}>{editingShop ? 'Edit Shop' : 'Add Shop'}</ModalHeader>
                <ModalBody>
                    <div className="container-out">
                        <div className="question-box question-form">
                            <div className="form-group">
                                <label htmlFor="shopName">Shop Name</label>
                                <input
                                    type="text"
                                    name="shopName"
                                    id="shopName"
                                    value={shopName}
                                    onChange={(e) => setShopName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="shopLink">Shopify Domain</label>
                                <input
                                    type="text"
                                    placeholder="sqwad-test-store-plus.myshopify.com"
                                    name="shopLink"
                                    id="shopLink"
                                    value={shopLink}
                                    onChange={(e) => setShopLink(e.target.value)}
                                />
                                <small>Must be a valid *.myshopify.com domain (lowercase, letters/digits/hyphens only).</small>
                            </div>
                            <div className="form-group">
                                <label htmlFor="shopActive" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    id="shopActive"
                                    type="checkbox"
                                    checked={active}
                                    onChange={(e) => setActive(e.target.checked)}
                                />
                                    Active
                                </label>
                            </div>

                            <div className="form-group text-center">
                                <button
                                    className="btn btn-primary btn-lg submit-button"
                                    onClick={createOrUpdateShop}
                                >
                                    {editingShop ? 'Update Shop' : 'Create Shop'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </div>
    );
}

export default SetUpShop;
