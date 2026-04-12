// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReadyNormLogoText } from "@/components/brand/ReadyNormLogo";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";

export default function ManagerLogin() {
  const APP_URL = "https://readynorm.app";
  const [mode, setMode] = useState("signin"); // signin | signup | magic | forgot | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Detect recovery mode from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'reset') {
      const tokenHash = params.get('token_hash');
      const type = params.get('type');
      if (tokenHash && type) {
        // Verify the OTP token from the email link
        supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
          if (error) {
            setError('This reset link is invalid or has expired. Please request a new one.');
            setMode('forgot');
          } else {
            setMode('reset');
          }
        });
      } else {
        setMode('reset');
      }
    }
  }, []);

  const nextUrl = new URLSearchParams(window.location.search).get("next") || "/";

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMessage("Password updated successfully! You can now sign in.");
      setPassword("");
      setMode("signin");
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    
    if (err) {
      setLoading(false);
      setError(err.message);
    } else {
      // Allow session to persist before redirect
      setTimeout(() => {
        window.location.href = nextUrl;
      }, 500);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${APP_URL}/ManagerLogin`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${APP_URL}${nextUrl}` },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMessage("Magic link sent! Check your email.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/background-image.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Two-column card — stacks vertically on mobile */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">

        {/* ── Left: Branding panel ─────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center gap-6 px-10 py-12 md:py-16 md:w-1/2 bg-white">
          <img src="/readynorm-logo-large.svg" alt="ReadyNorm" className="w-40 h-auto object-contain" />

          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-slate-900 leading-snug">
              <span className="text-sky-500">Standardize</span> sanitation.
            </p>
            <p className="text-2xl font-bold text-slate-900 leading-snug">
              <span className="text-purple-500">Strengthen</span> food safety.
            </p>
            <p className="text-2xl font-bold text-slate-900 leading-snug">
              <span className="text-emerald-500">Simplify</span> compliance.
            </p>
          </div>

          <p className="text-sm text-slate-500 text-center max-w-xs leading-relaxed">
            Manage MSS, track completion, and maintain audit readiness with real-time visibility across your entire operation.
          </p>
        </div>

        {/* ── Divider — vertical on md+, horizontal on mobile ─────────── */}
        <div className="hidden md:block w-px bg-slate-200 self-stretch my-8" />
        <div className="block md:hidden h-px bg-slate-200 mx-8" />

        {/* ── Right: Auth forms ─────────────────────────────────────────── */}
        <div className="flex flex-col justify-center px-8 py-10 md:py-16 md:w-1/2">
          {/* Header */}
          <div className="mb-6 text-center">
            <ReadyNormLogoText className="h-8 w-auto mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === "signin" && "Sign In"}
              {mode === "signup" && "Create Account"}
              {mode === "forgot" && "Reset Password"}
              {mode === "magic" && "Magic Link"}
              {mode === "reset" && "Set New Password"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === "signin" && "Sign in with your email and password"}
              {mode === "signup" && "Create a new account to get started"}
              {mode === "forgot" && "We'll send you a password reset link"}
              {mode === "magic" && "We'll email you a sign-in link"}
              {mode === "reset" && "Enter your new password below"}
            </p>
          </div>

          {/* Alerts */}
          {message && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : "Sign In"}
              </Button>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => { setMode("signup"); setError(null); setMessage(null); }} className="text-sky-600 hover:underline">
                    Create account
                  </button>
                  <button type="button" onClick={() => { setMode("forgot"); setError(null); setMessage(null); }} className="text-slate-500 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <button type="button" onClick={() => { setMode("magic"); setError(null); setMessage(null); }} className="text-slate-500 hover:underline text-center">
                  Sign in with magic link instead
                </button>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signupEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signupPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="signupPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
              </Button>
              <button type="button" onClick={() => { setMode("signin"); setError(null); setMessage(null); }} className="flex items-center gap-1 text-sm text-slate-500 hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              try {
                const { data, error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${APP_URL}/ManagerLogin?mode=reset`,
                });
                if (supabaseError) {
                  setError(supabaseError.message);
                } else {
                  setMessage("Password reset link sent! Check your email.");
                  setMode("signin");
                }
              } catch (err) {
                setError(err.message || "Failed to send reset email");
              }
              setLoading(false);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>
              <button type="button" onClick={() => { setMode("signin"); setError(null); setMessage(null); }} className="flex items-center gap-1 text-sm text-slate-500 hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {mode === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading || (password !== confirmPassword)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
              </Button>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
              <button type="button" onClick={() => { setMode("signin"); setError(null); setMessage(null); }} className="flex items-center gap-1 text-sm text-slate-500 hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            </form>
          )}

          {/* Magic Link Form */}
          {mode === "magic" && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magicEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="magicEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Magic Link"}
              </Button>
              <button type="button" onClick={() => { setMode("signin"); setError(null); setMessage(null); }} className="flex items-center gap-1 text-sm text-slate-500 hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}