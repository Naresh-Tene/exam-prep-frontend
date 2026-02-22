import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import AuthIllustration from "../components/AuthIllustration";
import "../styles/Auth.css";

function Login() {
  const [email, setEmail] = useState("");   // still called email in UI
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🔥 FIX: send username instead of email
      const { data } = await API.post("/auth/login", {
        username: email,
        password,
      });

      localStorage.setItem("user", JSON.stringify(data));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-illustration" aria-hidden="true">
          <AuthIllustration />
        </div>

        <div className="auth-form-column">
          <div className="auth-form-inner">
            <div className="auth-branding">
              <h1 className="auth-title">Exam Prep</h1>
              <p className="auth-subtitle">
                Welcome back. Please sign in to continue.
              </p>
            </div>

            <div className="auth-card">
              <form onSubmit={submitHandler} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <a
                    href="#"
                    className="auth-forgot"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </div>

                {error && (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? "Logging in…" : "Login"}
                </button>
              </form>
            </div>

            <p className="auth-footer-link">
              Don’t have an account? <Link to="/register">Register</Link>
            </p>
          </div>

          <p className="auth-page-footer">
            <span>Exam Prep Web App</span>
            <span className="auth-footer-sep">|</span>
            <span>
              Built by{" "}
              <a
                className="auth-footer-linkout"
                href="https://github.com/nareshpy-dev"
                target="_blank"
                rel="noreferrer"
              >
                Naresh Tene
              </a>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
