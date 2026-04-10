// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const nextUrl = new URLSearchParams(window.location.search).get("next") || "/ManagerDashboard";

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
    console.log("🔐 [ManagerLogin] Attempting sign in for:", email);
    
    const { error: err, data } = await supabase.auth.signInWithPassword({ email, password });
    
    if (err) {
      setLoading(false);
      console.error("❌ [ManagerLogin] Sign in failed:", err.message);
      setError(err.message);
    } else {
      console.log("✓ [ManagerLogin] Sign in successful, user:", data?.user?.email);
      console.log("✓ [ManagerLogin] Session:", data?.session?.user?.email);
      console.log("🔄 [ManagerLogin] Waiting for session to persist...");
      
      // Verify session was written to localStorage
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("✓ [ManagerLogin] Session verified in localStorage:", session.user.email);
        } else {
          console.warn("⚠️ [ManagerLogin] Session not found in localStorage yet!");
        }
      };
      
      // Check immediately and again after 1.5s
      await checkAuth();
      setTimeout(checkAuth, 1500);
      
      // Wait for session to be fully persisted before redirecting
      setTimeout(() => {
        console.log("🔄 [ManagerLogin] Redirecting to:", nextUrl);
        window.location.href = nextUrl;
      }, 2000);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <ReadyNormLogoText className="h-10 w-auto text-slate-900" />
          </div>
          <CardTitle className="text-xl">
            {mode === "signin" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
            {mode === "magic" && "Magic Link"}
            {mode === "reset" && "Set New Password"}
          </CardTitle>
          <CardDescription>
            {mode === "signin" && "Sign in with your email and password"}
            {mode === "signup" && "Create a new account to get started"}
            {mode === "forgot" && "We'll send you a password reset link"}
            {mode === "magic" && "We'll email you a sign-in link"}
            {mode === "reset" && "Enter your new password below"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
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
        </CardContent>
      </Card>
    </div>
  );
}