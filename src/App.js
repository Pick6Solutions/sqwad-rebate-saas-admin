// src/App.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Loading from './components/utils/Loading';
import AdminHome from './components/admin/AdminHome';
import AdminLogin from './components/admin/AdminLogin';
import SetUpTickets from './components/admin/SetUpTickets';
import SetUpQuestions from './components/admin/SetUpQuestions';
import SetUpGame from './components/admin/SetUpGame';
import SetUpTeamVariables from './components/admin/SetUpTeamVariables';
import SetUpRulesAndRegs from './components/admin/SetUpRulesAndRegs';
import SetUpTicketEmail from './components/admin/SetUpTicketEmail';
import LoginVariables from './components/admin/SetUpLoginVariables';

// swap this to your new firebase client module
// e.g., export const auth = getAuth(app) in src/firebaseClient.js
import { auth } from './base';
import { onAuthStateChanged } from 'firebase/auth';
import SetUpShop from "./components/admin/SetUpShop";
import ShopViewer from "./components/admin/ShopViewer";
import OrdersViewer from "./components/admin/OrdersViewer";

function AuthenticatedAdminRoute({ authenticated, children }) {
  return authenticated ? children : <Navigate to="/adminlogin" replace />;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [scoreboardOnly, setScoreboardOnly] = useState(false);
  const [isSqwadEmployee, setIsSqwadEmployee] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback(async (user) => {
    if (!user) {
      setCurrentUser(null);
      setAuthenticated(false);
      setScoreboardOnly(false);
      setIsSqwadEmployee(false);
      setLoading(false);
      return;
    }

    try {
      const idTokenResult = await user.getIdTokenResult();
      const claims = idTokenResult.claims || {};
      const scoreboard = !!claims.scoreboard;

      const emailDomain = (user.email || '').slice((user.email || '').lastIndexOf('@') + 1).toLowerCase();
      const isEmployee = emailDomain === 'sqwadhq.com';

      setCurrentUser(user);
      setAuthenticated(true);
      setScoreboardOnly(scoreboard);
      setIsSqwadEmployee(isEmployee);
    } catch (err) {
      console.error('Error fetching custom claims:', err);
      setCurrentUser(user);
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      // ensure loading true during transition
      setLoading(true);
      applyUser(user);
    });
    return () => unsub();
  }, [applyUser]);

  if (loading) return <Loading loading />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/adminlogin"
          element={<AdminLogin setCurrentUser={applyUser} />}
        />

        <Route
          path="/admin"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <AdminHome isSqwadEmployee={isSqwadEmployee} />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setupgame"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <SetUpGame currentUser={currentUser} />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setupquestions"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <SetUpQuestions />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setuptickets"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <SetUpTickets />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setupteamvariables"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <SetUpTeamVariables />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setuprulesandregs"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <SetUpRulesAndRegs />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setupticketemail"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <SetUpTicketEmail />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setupshop"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <SetUpShop />
            </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/shops/:shopId"
          element={
              <AuthenticatedAdminRoute authenticated={authenticated}>
                  <ShopViewer />
              </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/shops/:shopId/orders"
          element={
              <AuthenticatedAdminRoute authenticated={authenticated}>
                  <OrdersViewer />
              </AuthenticatedAdminRoute>
          }
        />

        <Route
          path="/setuploginvariables"
          element={
            <AuthenticatedAdminRoute authenticated={authenticated}>
              <LoginVariables />
            </AuthenticatedAdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/adminlogin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
