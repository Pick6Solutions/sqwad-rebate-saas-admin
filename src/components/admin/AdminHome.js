import React, { useEffect, useState, useCallback } from 'react';
import SideMenu from '../admin/SideMenu';
import TopMenu from '../admin/TopBar';
import '../../styles/css/AdminMain.css';

import { db } from '../../base';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

function AdminHome() {
  const [shops, setShops] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleChange = useCallback((evt) => {
    const { name, type, checked, value } = evt.target;
    console.debug('handleChange:', name, type === 'checkbox' ? checked : value);
  }, []);

  const fetchShopsCount = useCallback(async () => {
    try {
      const q = query(collection(db, 'shops'));
      const snapshot = await getCountFromServer(q);
      console.log(snapshot.data())
      setShops(snapshot.data().count || 0);
    } catch (err) {
      console.error('Failed to load shops count:', err);
      setShops(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShopsCount();
  }, [fetchShopsCount]);

  const totalShops = shops || 0;

  return (
    <div className="admin-wrapper">
      <div className="loading-screen" style={{ display: loading ? 'block' : 'none' }} />
      <SideMenu />
      <TopMenu />
      <div className="admin-main-panel">
        <div className="row" style={{ width: '100%' }}>
          <div className="col-md-1">
            <p style={{ color: 'black', marginLeft: 20 }}>v{process.env.REACT_APP_VERSION}</p>
          </div>
        </div>

        <div className="admin-grid-container four-columns">
          <div className="card card-styles text-xs-center" style={{ backgroundColor: 'black' }}>
            <div className="card-body">
              <blockquote className="card-bodyquote" style={{ margin: 0 }}>
                <div className="row">
                  <div className="col-md-8">
                    <p style={{ color: 'white', fontSize: 50, margin: 0 }}>{totalShops}</p>
                    <span style={{ color: '#f8f8ff', fontSize: 20 }}>Shops Open</span>
                  </div>
                </div>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminHome;
