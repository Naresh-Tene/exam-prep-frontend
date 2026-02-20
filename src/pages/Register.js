import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import AuthIllustration from "../components/AuthIllustration";
import "../styles/Auth.css";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await API.post("/auth/register", {
        username,
        email,
        password,
      });

      localStorage.setItem("user", JSON.stringify(data));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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
              <p className="auth-subtitle">Create your account to get started.</p>
            </div>

            <div className="auth-card">
              <form onSubmit={submitHandler} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="register-username">Username</label>
                  <input
                    id="register-username"
                    type="text"
                    placeholder="Your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="register-email">Email</label>
                  <input
                    id="register-email"
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
                  <label htmlFor="register-password">Password</label>
                  <input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className="auth-error" role="alert">{error}</p>}

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Creating account…" : "Register"}
                </button>
              </form>
            </div>

            <p className="auth-footer-link">
              Already have an account? <Link to="/">Login</Link>
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

export default Register;
