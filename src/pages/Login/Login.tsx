import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useApp } from "../../features/store/StoreProvider";
import { CrownLogo } from "../../components/ui/CrownLogo";

export default function Login() {
  const { state, store } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const presetEmail =
    (location.state as { email?: string } | null)?.email ?? "";
  const registered =
    (location.state as { registered?: boolean } | null)?.registered ?? false;

  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");
    setLoading(true);
    const res = await store.login(email, password);
    setLoading(false);
    if (!res.ok) return setError(res.error ?? "Login failed.");
    // Persist email in the demo auth roster mapping
    navigate(state.profile?.onboarded ? "/dashboard" : "/onboarding/location");
  };

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-royal/10 blur-[120px]" />
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

        {registered && (
          <div className="mb-4 rounded-lg border border-lime/40 bg-lime/10 px-4 py-3 text-sm text-lime">
            Account created. Enter your password to enter the empire.
          </div>
        )}

        <div className="panel p-7">
          <form onSubmit={submit} noValidate>
            <h2 className="font-display text-xl font-bold text-gray-100">
              Enter the Empire
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Frontend demo authentication — not production security.
            </p>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Email
            </label>
            <input
              className="input-field mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="warrior@empire.fitness"
              autoComplete="email"
            />

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                className="input-field pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
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

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" /> Opening
                  the gates…
                </>
              ) : (
                "Login"
              )}
            </button>

            <p className="mt-4 text-center text-sm text-gray-400">
              New warrior?{" "}
              <Link
                to="/register"
                className="font-semibold text-lime hover:underline"
              >
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
