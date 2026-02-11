import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertCircle, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HRLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
 
    try {
      // Fetch roles from API
      const response = await fetch('https://tecnoprismmainbackend.onrender.com/roles?includePassword=true');
     
      if (!response.ok) {
        throw new Error('Failed to connect to server. Please try again.');
      }
     
      const roles = await response.json();
      const rolesList = roles.data || roles || [];
     
      // Find matching user by username (email) OR Role and password
      const matchedUser = rolesList.find(
        (user) =>
          (user.username?.toLowerCase() === email.toLowerCase() ||
           user.Role?.toLowerCase() === email.toLowerCase()) &&
          user.password === password
      );
     
      if (matchedUser) {
        // Store auth info in localStorage
        localStorage.setItem('authToken', matchedUser._id );
        localStorage.setItem('userType', 'hr');
        localStorage.setItem('userRole', matchedUser.Role || 'HR');
        localStorage.setItem('userName', matchedUser.username || email);
        toast.success('Login Successful! Welcome HR.');
        navigate('/hr-dashboard');
      } else {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
 
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #9f7aea 0%, #667eea 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    },
    card: {
      width: '100%',
      maxWidth: '450px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      padding: '40px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px',
    },
    iconBox: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '60px',
      height: '60px',
      background: 'linear-gradient(135deg, #9f7aea 0%, #667eea 100%)',
      borderRadius: '50%',
      marginBottom: '15px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a202c',
      margin: '10px 0 5px 0',
    },
    subtitle: {
      color: '#718096',
      fontSize: '14px',
      marginTop: '5px',
    },
    errorBox: {
      marginBottom: '20px',
      padding: '15px',
      background: '#fee',
      border: '1px solid #fcc',
      borderRadius: '8px',
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
    },
    errorText: {
      color: '#c53030',
      fontSize: '14px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    label: {
      color: '#2d3748',
      fontWeight: '600',
      marginBottom: '8px',
      fontSize: '14px',
    },
    input: {
      padding: '12px 14px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      transition: 'all 0.3s ease',
    },
    button: {
      padding: '12px',
      marginTop: '10px',
      background: 'linear-gradient(135deg, #9f7aea 0%, #667eea 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: 'bold',
      fontSize: '16px',
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      opacity: loading ? 0.7 : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    link: {
      textAlign: 'center',
      marginTop: '20px',
      fontSize: '14px',
      color: '#718096',
    },
    infoBox: {
      marginTop: '25px',
      padding: '16px',
      background: '#f3e8ff',
      border: '2px solid #ddd6fe',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#6b21a8',
      lineHeight: '1.6',
    }
  };
 
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img
              src="https://www.tecnoprism.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-full.4865c8ea.png&w=1920&q=75%22"
              alt="TecnoPrism Logo"
              style={{ maxWidth: '180px', height: 'auto' }}
            />
          </div>
          <h1 style={styles.title}>HR Login</h1>
          <p style={styles.subtitle}>Walking Interview Tecnoprism</p>
        </div>
 
        {/* Error Alert */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} color="#c53030" style={{ marginTop: '2px' }} />
            <p style={styles.errorText}>{error}</p>
          </div>
        )}
 
        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email or Role</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@company.com or Your Role"
              required
              style={styles.input}
            />
          </div>
 
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>
 
          <button
              type="submit"
              disabled={loading}
              className="auth-button btn-primary"
            >
              {/* <LogIn size={18} /> */}
            {loading ? 'Logging in...' : 'Login as HR'}
          </button>
        </form>
 
        {/* Footer */}
        <div style={styles.link}>
          <p>
            Don't have an account? Contact your administrator
          </p>
          {/* <p style={{ marginTop: '10px' }}>
            Are you a candidate?{' '}
            <Link
              to="/user-login"
              style={{ color: '#9f7aea', textDecoration: 'none', fontWeight: 'bold' }}
            >
              Candidate Login
            </Link> */}
          {/* </p> */}
        </div>
 
        {/* Info Box */}
        {/* <div style={styles.infoBox}>
          <strong>Demo Credentials:</strong>
          <br />
          Email: hr@example.com
          <br />
          Password: password123
        </div> */}
      </div>
    </div>
  );
}
 
 