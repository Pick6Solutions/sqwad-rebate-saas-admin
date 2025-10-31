// src/components/admin/AdminLogin.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../../base'; // <-- export auth from your init file
import {
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';

import logoImage from '../../styles/images/sqwad-hand.png';
import logoWithTextImageBlack from '../../styles/images/new_sqwad_logo.png';
import '../../styles/css/main.css';
import Swal from 'sweetalert2';

export default function AdminLogin({ setCurrentUser, user }) {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [redirect, setRedirect] = useState(false);

  const authWithEmailPassword = useCallback(async (event) => {
    event.preventDefault();
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    setLoading(true);

    try {
      // (Optional) check sign-in methods; not strictly needed before signIn
      await fetchSignInMethodsForEmail(auth, email);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const u = userCredential.user;

      if (u) {
        // clear form
        event.target.reset?.();
        // let parent App process custom claims & routing flags
        await setCurrentUser?.(u);
        setRedirect(true);
      } else {
        Swal.fire({
          title: 'Wrong credentials',
          text: 'Check your email and password and try again!',
          icon: 'warning',
          confirmButtonText: 'Ok',
        });
      }
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        Swal.fire({
          title: 'Uh oh!',
          text: 'User not found, is the email correct?',
          icon: 'error',
          confirmButtonText: 'Ok',
        });
      } else if (error?.code === 'auth/wrong-password') {
        Swal.fire({
          title: 'Uh oh!',
          text: 'Password incorrect!',
          icon: 'error',
          confirmButtonText: 'Ok',
        });
      } else {
        Swal.fire({
          title: 'Uh oh!',
          text: error?.message ?? 'Login failed.',
          icon: 'error',
          confirmButtonText: 'Ok',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [setCurrentUser]);

  useEffect(() => {
    // if already logged in, bounce to /admin
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setRedirect(true);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (redirect || user) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="auth-fluid">
      <div className="loading-screen" style={{ display: loading ? 'block' : 'none' }} />
      <div className="auth-fluid-form-box">
        <div className="align-items-center d-flex h-100">
          <div className="card-body">

            <div className="auth-brand text-center text-lg-left" style={{ marginBottom: '50px' }}>
              <img src={logoWithTextImageBlack} alt="" height="auto" width="200px" />
            </div>

            <h4 className="mt-0" style={{ fontWeight: 'bolder', fontFamily: 'Roboto' }}>Welcome</h4>
            <p className="text-muted2 mb-4" style={{ fontWeight: 'bold', fontFamily: 'Roboto' }}>
              Enter your email address and password to access account.
            </p>

            <form onSubmit={authWithEmailPassword} style={{ fontWeight: 'bold', fontFamily: 'Roboto' }}>
              <div className="mb-3">
                <label htmlFor="emailaddress">Email address</label>
                <input
                  id="emailaddress"
                  className="form-control"
                  type="email"
                  name="email"
                  ref={emailRef}
                  placeholder="Enter your email"
                  autoComplete="username"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  className="form-control"
                  name="password"
                  type="password"
                  ref={passwordRef}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              <div className="input-group">
                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={loading}
                  style={{ backgroundColor: '#ff1f3e', borderColor: '#ff1f3e', fontWeight: 'bold', fontFamily: 'Roboto' }}
                >
                  {loading ? 'Logging in…' : 'Log In'}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>

      <div className="auth-fluid-right text-center">
        <div className="auth-user-testimonial">
          <img src={logoImage} width="200px" alt="" />
        </div>
      </div>
    </div>
  );
}
