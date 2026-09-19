import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useState } from "react";
import api from "./services/api";
import Services from "./pages/Services";
import "./index.css";
import "./App.css";
import CustomerDashboard from "./pages/CustomerDashboard";
import QueuePage from "./pages/QueuePage";
import StaffDashboard from "./pages/StaffDashboard";
import Appointments from "./pages/Appointments";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}


function Layout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function goToMyQueue() {
    const serviceId = localStorage.getItem("active_queue_service_id");

    if (serviceId) {
      navigate(`/queue/${serviceId}`);
    }

    setMenuOpen(false);
  }

  const isStaff = user?.role === "staff" || user?.role === "admin";

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app">
      <nav className="navbar">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <Link to="/" className="logo">
          Queue<span>Less</span>
        </Link>

        <div className="nav-links">
          {isStaff ? (
            <>
              <Link to="/staff">Staff Dashboard</Link>
              <Link to="/appointments">Appointments</Link>
            </>
          ) : (
            <>
              <Link to="/services">Services</Link>
              <Link to="/appointments">Appointments</Link>
              <button
                type="button"
                className="nav-link-button"
                onClick={goToMyQueue}
              >
                My Queue
              </button>
            </>
          )}
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              {!isStaff && (
                <Link to="/dashboard" className="login-link">
                  Dashboard
                </Link>
              )}

              <button
                type="button"
                onClick={logout}
                className="nav-button"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="login-link">
                Login
              </Link>

              <Link to="/register" className="nav-button">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div
          className="menu-overlay"
          onClick={closeMenu}
        />
      )}

      <aside className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">Menu</span>

          <button
            type="button"
            className="menu-close"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <div className="mobile-menu-links">
          {isStaff ? (
            <>
              <Link to="/staff" onClick={closeMenu}>
                Staff Dashboard
              </Link>

              <Link to="/appointments" onClick={closeMenu}>
                Appointments
              </Link>
            </>
          ) : (
            <>
              <Link to="/services" onClick={closeMenu}>
                Services
              </Link>

              <Link to="/appointments" onClick={closeMenu}>
                Appointments
              </Link>

              <button
                type="button"
                className="mobile-menu-link"
                onClick={goToMyQueue}
              >
                My Queue
              </button>

              <Link to="/dashboard" onClick={closeMenu}>
                Dashboard
              </Link>
            </>
          )}
        </div>

        {user && (
          <button
            type="button"
            className="mobile-logout"
            onClick={() => {
              logout();
              closeMenu();
            }}
          >
            Logout
          </button>
        )}
      </aside>

      <main>{children}</main>
    </div>
  );
}

function Home() {
  return (
    <section className="hero">
      <div className="hero-content">
        <p className="eyebrow">SMART QUEUE MANAGEMENT</p>

        <h1>
          Skip the wait.
          <br />
          <span>Keep your time.</span>
        </h1>

        <p className="hero-description">
          Book appointments, join queues remotely, and track your position
          in real time without standing around.
        </p>

        <div className="hero-actions">
          <Link to="/services" className="primary-button">
            Explore Services
          </Link>

          <Link to="/register" className="secondary-button">
            Create Account
          </Link>
        </div>

        <div className="hero-stats">
          <div>
            <strong>Real-time</strong>
            <span>Queue updates</span>
          </div>

          <div>
            <strong>24/7</strong>
            <span>Online booking</span>
          </div>

          <div>
            <strong>0</strong>
            <span>Unnecessary waiting</span>
          </div>
        </div>
      </div>

      <div className="queue-card">
        <div className="queue-card-header">
          <span>LIVE QUEUE</span>
          <span className="live-dot">● LIVE</span>
        </div>

        <p className="queue-label">Dental Cleaning</p>

        <div className="token-display">
          <span>NOW SERVING</span>
          <strong>A12</strong>
        </div>

        <div className="queue-info">
          <div>
            <span>Your token</span>
            <strong>A16</strong>
          </div>

          <div>
            <span>People ahead</span>
            <strong>4</strong>
          </div>
        </div>

        <div className="progress">
          <div className="progress-bar" />
        </div>

        <p className="estimated">
          Estimated wait <strong>~20 min</strong>
        </p>
      </div>
    </section>
  );
}

function Login() {
  return (
    <AuthPage
      title="Welcome back"
      subtitle="Sign in to manage your appointments and queues."
      button="Sign In"
      footerText="Don't have an account?"
      footerLink="Create one"
      footerPath="/register"
    />
  );
}

function Register() {
  return (
    <AuthPage
      title="Create your account"
      subtitle="Start managing your waiting time smarter."
      button="Create Account"
      footerText="Already have an account?"
      footerLink="Sign in"
      footerPath="/login"
    />
  );
}

function AuthPage({
  title,
  subtitle,
  button,
  footerText,
  footerLink,
  footerPath,
}) {
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  const isRegister = button === "Create Account";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await api.post("/auth/register", {
          name,
          email,
          password,
        });

        navigate("/login");
      } else {
        const response = await api.post("/auth/login", {
          email,
          password,
        });

        localStorage.setItem(
          "access_token",
          response.data.access_token
        );

        await loadUser();
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          Queue<span>Less</span>
        </Link>

        <h2>{title}</h2>

        <p className="auth-subtitle">
          {subtitle}
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {isRegister && (
            <label>
              Name

              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "◉" : "◌"}
              </button>
            </div>
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button full"
            disabled={loading}
          >
            {loading ? "Please wait..." : button}
          </button>
        </form>

        <p className="auth-footer">
          {footerText}{" "}
          <Link to={footerPath}>
            {footerLink}
          </Link>
        </p>
      </div>
    </section>
  );
}

function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === "staff" || user?.role === "admin") {
    return <Navigate to="/staff" replace />;
  }

  return <CustomerDashboard />;
}





function Staff() {
  return (
    <Placeholder
      title="Staff Dashboard"
      text="Queue management tools will appear here."
    />
  );
}

function Placeholder({ title, text }) {
  return (
    <section className="placeholder">
      <p className="eyebrow">QUEUELESS</p>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/services"
            element={
              <ProtectedRoute roles={["customer"]}>
                <Services />
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/queue/:serviceId"
            element={
              <ProtectedRoute roles={["customer"]}>
                <QueuePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff"
            element={
              <ProtectedRoute roles={["staff", "admin"]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;