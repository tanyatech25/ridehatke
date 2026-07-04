"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    setLoading(true);
    setError("");

    try {
      // Check if user exists in the database
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // User exists — now send OTP
        const otpRes = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier })
        });
        
        const otpData = await otpRes.json();
        
        if (otpRes.ok) {
          setStep("otp");
          if (otpData.code) {
            alert(`[Development Mode] Your OTP code is: ${otpData.code}`);
          }
        } else {
          setError(otpData.error || "Failed to send OTP.");
        }
      } else {
        // User not found
        setError(data.error || "Account not found. Please sign up first.");
      }
    } catch (err) {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Verify OTP first
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp })
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      // 2. Fetch user data
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('ridehatke_user', JSON.stringify(data.user));
        alert(`Welcome back, ${data.user.firstName}! 🎉`);
        router.push("/");
      } else {
        setError(data.error || "Failed to login.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-image"></div>
      <div className="bg-overlay"></div>

      <header className="top-nav">
        <div className="top-nav-left">
          <Link href="/" className="nav-logo" style={{ textDecoration: 'none' }}>RideHatke</Link>
        </div>
        <div className="top-nav-right">
          <Link href="/help" className="nav-link hide-mobile">Help</Link>
          <button className="theme-toggle nav-theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className="container">
        <div className="glass-panel animate-slide-up">
          <h1 className="panel-title">Welcome Back</h1>
          
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              color: '#ef4444',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              ⚠️ {error}
            </div>
          )}

          {step === "details" ? (
            <form onSubmit={handleSendOtp}>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <span className="input-icon">✉️</span>
                <input 
                  type="email" 
                  className="text-input" 
                  placeholder="Enter your email address" 
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Checking..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="animate-fade-in">
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                color: '#10b981',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                ✅ Account verified! OTP sent to your email: {identifier}
              </div>
              <div className="input-group">
                <label className="input-label">Enter OTP</label>
                <span className="input-icon">🔐</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Enter 4-digit OTP" 
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setError(""); }}
                  maxLength={4}
                  required
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'left' }}>
                  💡 Local Demo Bypass: Enter <strong>1234</strong> as the OTP code.
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              <button 
                type="button" 
                onClick={() => { setStep("details"); setError(""); }}
                style={{ 
                  marginTop: '1rem', 
                  width: '100%', 
                  padding: '1rem', 
                  background: 'transparent', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)', 
                  borderRadius: '20px', 
                  cursor: 'pointer',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  fontFamily: 'inherit'
                }}
              >
                Back
              </button>
            </form>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Don't have an account? <Link href="/signup" style={{ color: '#EC4899', fontWeight: 'bold', textDecoration: 'none' }}>Sign up</Link>
          </div>
        </div>
      </div>
    </>
  );
}
