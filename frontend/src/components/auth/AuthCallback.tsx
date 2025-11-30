import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingPage } from '../ui/LoadingPage';

export function AuthCallback() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Wait for animation to complete (3 full cycles) + pause
    // Animation: 1.5s duration + 1s stagger = 2.5s total
    // Let it complete 2 full cycles = 5s + 1s pause = 6s total
    const timer = setTimeout(() => {
      if (user) {
        // User is logged in, redirect to discover page
        navigate('/discover');
      } else {
        // User logged out, redirect to home
        navigate('/');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  return <LoadingPage message="Processing authentication..." size="md" />;
}