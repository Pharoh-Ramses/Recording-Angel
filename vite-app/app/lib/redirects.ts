// Centralized redirect logic for auth states
import { redirect } from 'react-router';

export function redirectToLogin() {
  return redirect('/login');
}

export function redirectUnauthenticatedUsers() {
  // For non-authenticated users, redirect to login
  return redirectToLogin();
}

export function redirectUnapprovedUsers() {
  // For authenticated but unapproved users, redirect to pending approval
  return redirect('/pending-approval');
}