"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    if (firstName && lastName && identifier) {
      setLoading(true);
      setError("");
      try {
        const res = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier })
        });
        const data = await res.json();
        if (res.ok) {
          setStep("otp");
          if (data.code) {
            alert(`[Development Mode] Your OTP code is: ${data.code}`);
          }
        } else {
          setError(data.error || "Failed to send OTP");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
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

      // 2. If OTP is valid, proceed with Signup
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, identifier })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Save user data to localStorage
        localStorage.setItem('ridehatke_user', JSON.stringify(data.user));
        alert(`Sign up successful! Welcome to RideHatke, ${firstName}. 🎉`);
        router.push("/");
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError("Failed to connect to the server.");
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
          <h1 className="panel-title">Create Account</h1>

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
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">First Name</label>
                  <span className="input-icon">👤</span>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="First" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Last Name</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    style={{ paddingLeft: '1.25rem' }}
                    placeholder="Last" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

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
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="animate-fade-in">
              <div className="input-group">
                <label className="input-label">Enter OTP sent to your email: {identifier}</label>
                <span className="input-icon">🔐</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Enter 4-digit OTP" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={4}
                  required
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'left' }}>
                  💡 Local Demo Bypass: Enter <strong>1234</strong> as the OTP code.
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              <button 
                type="button" 
                onClick={() => setStep("details")} 
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
                  fontWeight: 600
                }}
              >
                Back
              </button>
            </form>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Already have an account? <Link href="/login" style={{ color: '#EC4899', fontWeight: 'bold', textDecoration: 'none' }}>Log in</Link>
          </div>
        </div>
      </div>
    </>
  );
}
