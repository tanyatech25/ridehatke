"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });

type Ride = {
  id: string;
  provider: string;
  type: string;
  price: number;
  eta: string;
  link: string;
};

// Translation Dictionary
const translations: Record<string, Record<string, string>> = {
  EN: {
    navRide: "Ride",
    navHelp: "Help",
    navLogin: "Log in",
    navSignup: "Sign up",
    title: "Get a ride",
    pickupLabel: "Pickup",
    pickupPlaceholder: "Current Location (e.g. Connaught Place)",
    dropoffLabel: "Drop-off",
    dropoffPlaceholder: "Destination (e.g. India Gate)",
    compareBtn: "Compare Fares",
    searchingBtn: "Searching & Routing...",
    loadingText: "Scraping live web prices...",
    bestValue: "Best Value",
    away: "away",
    bookBtn: "Book",
    recentSearches: "Recent Searches",
  },
  HI: {
    navRide: "सवारी",
    navHelp: "मदद",
    navLogin: "लॉग इन",
    navSignup: "साइन अप",
    title: "सवारी बुक करें",
    pickupLabel: "पिकअप",
    pickupPlaceholder: "वर्तमान स्थान (जैसे: Connaught Place)",
    dropoffLabel: "ड्रॉप-ऑफ़",
    dropoffPlaceholder: "मंजिल (जैसे: India Gate)",
    compareBtn: "किराये की तुलना करें",
    searchingBtn: "खोजा जा रहा है...",
    loadingText: "वेब से असली प्राइसेस निकाले जा रहे हैं...",
    bestValue: "सर्वश्रेष्ठ मूल्य",
    away: "दूर",
    bookBtn: "बुक करें",
    recentSearches: "हाल की खोजें",
  }
};

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState("EN");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{firstName: string, lastName: string} | null>(null);

  // Map States
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [drivingTime, setDrivingTime] = useState<string | null>(null);
  
  // Interactive UI States
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<string[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);

  const t = translations[language] || translations.EN;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Check if user is logged in
  useEffect(() => {
    const userData = localStorage.getItem('ridehatke_user');
    if (userData) {
      try {
        setLoggedInUser(JSON.parse(userData));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ridehatke_user');
    setLoggedInUser(null);
  };

  // AGENTIC AI: Listen for ride search commands from the chatbot
  const aiSearch = async (aiPickup: string, aiDropoff: string) => {
    setPickup(aiPickup);
    setDropoff(aiDropoff);
    setShowPickupDropdown(false);
    setShowDropoffDropdown(false);
    setLoading(true);
    setHasSearched(true);
    setRides([]);

    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup: aiPickup, dropoff: aiDropoff }),
      });
      const data = await res.json();
      if (data.results) {
        setRides(data.results);
        if (data.routeCoordinates) setRouteCoordinates(data.routeCoordinates);
        if (data.pickupCoords) setPickupCoords(data.pickupCoords);
        if (data.dropoffCoords) setDropoffCoords(data.dropoffCoords);
        if (data.distanceKm) setDistanceKm(data.distanceKm);
        if (data.drivingTime) setDrivingTime(data.drivingTime);
      }
    } catch (error) {
      console.error("AI search failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleAISearch = (e: any) => {
      const { pickup: aiPickup, dropoff: aiDropoff } = e.detail;
      if (aiPickup && aiDropoff) {
        aiSearch(aiPickup, aiDropoff);
      }
    };
    window.addEventListener('ridehatke-ai-search', handleAISearch);
    return () => window.removeEventListener('ridehatke-ai-search', handleAISearch);
  }, []);

  // Fetch location suggestions from OpenStreetMap
  const fetchSuggestions = async (query: string, setSuggestions: (s: string[]) => void) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", India")}&limit=4`, {
        headers: { 'User-Agent': 'RideHatkeAggregator/1.0' }
      });
      const data = await res.json();
      setSuggestions(data.map((item: any) => item.display_name.split(',').slice(0,3).join(',')));
    } catch (e) {
      console.error(e);
    }
  };

  const onPickupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPickup(val);
    setShowPickupDropdown(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchSuggestions(val, setPickupSuggestions), 500);
  };

  const onDropoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDropoff(val);
    setShowDropoffDropdown(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchSuggestions(val, setDropoffSuggestions), 500);
  };

  const handleGPS = () => {
    setGpsLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`, {
            headers: { 'User-Agent': 'RideHatkeAggregator/1.0' }
          });
          const data = await res.json();
          if (data && data.display_name) {
            setPickup(data.display_name.split(',').slice(0,3).join(','));
            setShowPickupDropdown(false);
          }
        } catch (e) {
          alert("Failed to reverse geocode location.");
        }
        setGpsLoading(false);
      }, () => {
        alert("Location permission denied.");
        setGpsLoading(false);
      });
    } else {
      alert("Geolocation not supported");
      setGpsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) return;

    setShowPickupDropdown(false);
    setShowDropoffDropdown(false);
    setLoading(true);
    setHasSearched(true);
    setRides([]);

    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, dropoff }),
      });
      const data = await res.json();
      if (data.results) {
        setRides(data.results);
        if (data.routeCoordinates) setRouteCoordinates(data.routeCoordinates);
        if (data.pickupCoords) setPickupCoords(data.pickupCoords);
        if (data.dropoffCoords) setDropoffCoords(data.dropoffCoords);
        if (data.distanceKm) setDistanceKm(data.distanceKm);
        if (data.drivingTime) setDrivingTime(data.drivingTime);
      }
    } catch (error) {
      console.error("Failed to fetch rides", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (ride: Ride) => {
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ride.provider,
          type: ride.type,
          price: ride.price,
          pickup,
          dropoff
        })
      });

      let redirectUrl = "";
      if (ride.provider === "Uber") {
        redirectUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(dropoff)}`;
      } else if (ride.provider === "Ola") {
        redirectUrl = `https://book.olacabs.com/?drop_name=${encodeURIComponent(dropoff)}`;
      } else if (ride.provider === "Rapido") {
        redirectUrl = "https://rapido.app/";
      } else if (ride.provider === "BluSmart") {
        redirectUrl = "https://blu-smart.com/";
      } else {
        redirectUrl = "https://google.com";
      }

      alert(`Redirecting you to ${ride.provider} to complete your booking!`);
      window.open(redirectUrl, '_blank');
    } catch (e) {
      alert("Failed to save booking");
    }
  };

  const getProviderClass = (provider: string) => {
    const p = provider.toLowerCase();
    if (p.includes("uber")) return "provider-uber";
    if (p.includes("ola")) return "provider-ola";
    if (p.includes("rapido")) return "provider-rapido";
    if (p.includes("blusmart")) return "provider-blusmart";
    return "";
  };

  const shareOnWhatsApp = () => {
    if (rides.length === 0) return;
    const cheapest = rides[0];
    const text = language === 'HI' 
      ? `🚕 मुझे RideHatke पर ${pickup} से ${dropoff} के लिए सबसे सस्ती कैब मिली!\n\n🏆 सबसे बेस्ट: ${cheapest.provider} ${cheapest.type} सिर्फ ₹${cheapest.price} में (${cheapest.eta} दूर)।\n\nआप भी ridehatke.com पर चेक करें!`
      : `🚕 I found the cheapest cab from ${pickup} to ${dropoff} on RideHatke!\n\n🏆 Best Option: ${cheapest.provider} ${cheapest.type} for ₹${cheapest.price} (${cheapest.eta} away).\n\nCompare live prices yourself at ridehatke.com!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <>
      {/* Background Images */}
      <div className="bg-image"></div>
      <div className="bg-overlay"></div>

      {/* Unique Floating Top Navigation */}
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="nav-logo">RideHatke</div>
          <div className="nav-links hide-mobile">
            <Link href="/" className="nav-link active"><span style={{fontSize: '1.2em'}}>🚕</span> {t.navRide}</Link>
          </div>
        </div>
        <div className="top-nav-right">
          <div className="nav-dropdown hide-mobile">
            <button className="nav-link dropdown-toggle" aria-haspopup="true">
              🌐 {language} <span style={{fontSize: '0.6em', marginLeft: '4px'}}>▼</span>
            </button>
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => { setLanguage('EN'); localStorage.setItem('appLanguage', 'EN'); }}>English (EN)</button>
              <button className="dropdown-item" onClick={() => { setLanguage('HI'); localStorage.setItem('appLanguage', 'HI'); }}>हिंदी (Hindi)</button>
            </div>
          </div>
          <Link href="/help" className="nav-link hide-mobile">{t.navHelp}</Link>
          {loggedInUser ? (
            <div className="nav-dropdown">
              <button 
                className="dropdown-toggle" 
                aria-haspopup="true"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--primary-gradient)',
                  color: 'white',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-btn)',
                  transition: 'transform 0.2s ease',
                  fontFamily: 'inherit'
                }}
              >
                {loggedInUser.firstName.charAt(0).toUpperCase()}
              </button>
              <div className="dropdown-menu" style={{ right: 0, minWidth: '200px' }}>
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '0.25rem'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {loggedInUser.firstName} {loggedInUser.lastName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Personal Account
                  </div>
                </div>
                <button className="dropdown-item">⚙️ Settings</button>
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                  <button className="dropdown-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
                    🚪 Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="nav-link hide-mobile">{t.navLogin}</Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button className="nav-btn-signup">{t.navSignup}</button>
              </Link>
            </>
          )}
          <button 
            className="theme-toggle nav-theme-toggle" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className="container">
        <div className="glass-panel animate-slide-up">
          <h1 className="panel-title">{t.title}</h1>
          
          <form onSubmit={handleSearch}>
            
            {/* Pickup Input Group with Dropdown */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">{t.pickupLabel}</label>
              <div className="input-wrapper">
                <span className="input-icon">📍</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder={t.pickupPlaceholder} 
                  value={pickup}
                  onChange={onPickupChange}
                  onFocus={() => setShowPickupDropdown(true)}
                  required
                />
              </div>

              {showPickupDropdown && (
                <div className="suggestion-dropdown">
                  {/* Current Location Option */}
                  <div className={`suggestion-item gps-suggestion ${gpsLoading ? 'loading' : ''}`} onClick={handleGPS}>
                    <span className="suggestion-icon">🎯</span>
                    <strong style={{ color: 'var(--accent)' }}>
                      {gpsLoading ? (language === 'HI' ? "लोकेशन ढूँढी जा रही है..." : "Locating...") : (language === 'HI' ? "मेरी वर्तमान लोकेशन (GPS)" : "Use my current location")}
                    </strong>
                  </div>

                  {pickupSuggestions.map((s, i) => (
                    <div key={i} className="suggestion-item" onClick={() => { setPickup(s); setShowPickupDropdown(false); }}>
                      <span className="suggestion-icon">📍</span> {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dropoff Input Group with Dropdown */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">{t.dropoffLabel}</label>
              <div className="input-wrapper">
                <span className="input-icon">🏁</span>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder={t.dropoffPlaceholder} 
                  value={dropoff}
                  onChange={onDropoffChange}
                  onFocus={() => setShowDropoffDropdown(true)}
                  required
                />
              </div>

              {showDropoffDropdown && dropoffSuggestions.length > 0 && (
                <div className="suggestion-dropdown">
                  {dropoffSuggestions.map((s, i) => (
                    <div key={i} className="suggestion-item" onClick={() => { setDropoff(s); setShowDropoffDropdown(false); }}>
                      <span className="suggestion-icon">🏁</span> {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t.searchingBtn : t.compareBtn}
            </button>
          </form>

          {/* Results Section */}
          {loading && (
            <div className="results-container" style={{ marginTop: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                {t.loadingText}
              </div>
              {/* Premium Skeleton Shimmer Loaders */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                   <div className="skeleton-shimmer"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && hasSearched && pickupCoords && dropoffCoords && (
            <RouteMap 
              pickupCoords={pickupCoords} 
              dropoffCoords={dropoffCoords} 
              routeCoordinates={routeCoordinates} 
            />
          )}

          {!loading && hasSearched && rides.length > 0 && (
            <div className="results-container">
              {/* Trip Info Bar */}
              {distanceKm && drivingTime && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  background: 'var(--surface-color)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '1rem 1.5rem',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{distanceKm} km</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Distance</div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{drivingTime}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Drive Time</div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{rides.length}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Options</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{t.recentSearches || "Available Rides"}</h3>
                <button onClick={shareOnWhatsApp} className="btn-whatsapp">
                  <span style={{ fontSize: '1.2rem' }}>💬</span> Share via WhatsApp
                </button>
              </div>
              {rides.map((ride, index) => {
                const isCheapest = index === 0;
                return (
                  <div 
                    key={ride.id} 
                    className={`result-card ${isCheapest ? 'highlight-cheapest' : ''}`} 
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`provider-info ${getProviderClass(ride.provider)}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="provider-name">{ride.provider}</span>
                        {isCheapest && <span className="badge-cheapest">🏆 {t.bestValue}</span>}
                      </div>
                      <span className="ride-type">{ride.type}</span>
                    </div>
                    
                    <div className="price-info">
                      <span className="price">₹{ride.price}</span>
                      <span className="eta">🕐 {ride.eta}</span>
                    </div>

                    <button onClick={() => handleBook(ride)} className="btn-book">
                      {t.bookBtn}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
