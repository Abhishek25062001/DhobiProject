import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initAnalytics, trackPageView, identify, track, EVENTS } from '../services/analytics';

// Mounted once inside the router: records screen views, and links the anonymous
// visitor to the customer account after sign-in.
export default function AnalyticsTracker() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const previousUser = useRef(undefined);

  useEffect(() => { initAnalytics(); }, []);

  // Wait one frame so lazy pages can set document.title before the view is recorded.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => trackPageView(pathname));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const id = user?._id || null;
    if (id) identify(id, { role: user.role || 'customer' });
    else if (previousUser.current) track(EVENTS.LOGOUT);
    previousUser.current = id;
  }, [user?._id]);

  return null;
}
