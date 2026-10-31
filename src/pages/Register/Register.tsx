import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Swords } from "lucide-react";
import { useApp } from "../../features/store/StoreProvider";
import { CrownLogo } from "../../components/ui/CrownLogo";

export default function Register() {
  const { store } = useApp();
  const navigate = useNavigate();
  const [fullName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    else if (fullName.trim().length < 2) e.fullName = "Name looks too short.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "Enter a valid email address.";
    if (password.length < 8)
      e.password = "Password must be at least 8 characters.";
    else if (!/[0-9]/.test(password))
      e.password = "Include at least one number.";
    if (confirm !== password) e.confirm = "Passwords do not match.";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const res = await store.register(fullName.trim(), email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      setErrors({ email: res.error ?? "Registration failed." });
      return;
    }
    setSuccess(true);
    setTimeout(
      () =>
        navigate("/login", {
          state: { email: email.trim(), registered: true },
        }),
      900,
    );
  };

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-royal/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[900px] -translate-x-1/2 rounded-[100%] bg-lime/5 blur-[80px]" />
      </div>

      <div className="animate-fade-up relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <CrownLogo size={56} />
          <h1 className="gold-text font-display text-3xl font-black tracking-wide">
            FITNESS MESSER
          </h1>
          <p className="text-sm text-gray-500">
            Let's Build Empire With Exercise.
          </p>
        </div>

        <div className="panel p-7">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Swords size={36} className="text-lime" />
              <div className="font-display text-xl font-bold text-lime">
                Warrior enrolled!
              </div>
              <p className="text-sm text-gray-400">Routing you to the gates…</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="font-display text-xl font-bold text-gray-100">
                Create My Account
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Frontend demo authentication — accounts live only in this
                browser until the backend arrives.
              </p>

              <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Full name
              </label>
              <input
                className={`input-field mt-1.5 ${errors.fullName ? "border-red-500/70" : ""}`}
                value={fullName}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun the Unbroken"
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>
              )}

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email address
              </label>
              <input
                className={`input-field mt-1.5 ${errors.email ? "border-red-500/70" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="warrior@empire.fitness"
                type="email"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  className={`input-field pr-11 ${errors.password ? "border-red-500/70" : ""}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"}
                  placeholder="8+ characters, 1 number"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label="Show or hide password"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Confirm password
              </label>
              <input
                className={`input-field mt-1.5 ${errors.confirm ? "border-red-500/70" : ""}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
              />
              {errors.confirm && (
                <p className="mt-1 text-xs text-red-400">{errors.confirm}</p>
              )}

              <button className="btn-primary mt-6 w-full" disabled={loading}>
                {loading ? "Forging your account…" : "Create My Account"}
              </button>

              <p className="mt-4 text-center text-sm text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-lime hover:underline"
                >
                  Login
                </Link>
              </p>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-gray-600">
          No phone number, payment details, or unnecessary personal information
          required.
        </p>
      </div>
    </div>
  );
}
