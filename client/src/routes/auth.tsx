import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { TradeXLogo } from "@/components/tradex-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — TradeX" },
      { name: "description", content: "Sign in to your TradeX paper trading account." },
      { property: "og:title", content: "Sign In — TradeX" },
      { property: "og:description", content: "Access your risk-free trading workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function GoogleMark() {
  return (
    <svg className="size-5" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate({ from: "/auth" });
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingIdToken, setPendingIdToken] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const valid = /^[a-zA-Z0-9]{3,20}$/.test(username);

  // This handles the Google credential response for both sign in and sign up
  const handleGoogleAuth = async (idToken: string, isSignup = false) => {
    setLoading(true);
    try {
      if (isSignup && pendingIdToken) {
        // Complete signup with username
        const res = await authApi.completeSignup(pendingIdToken, username);
        login(res.token, res.user);
        toast.success("Account created!", { description: `Welcome, ${res.user.userName}!` });
        navigate({ to: "/dashboard" });
      } else {
        // Try to sign in or detect new user
        const res = await authApi.googleLogin(idToken);
        if (res.isNewUser) {
          // New user — show username picker
          setPendingIdToken(idToken);
          setShowSignup(true);
          toast.info("One more step!", { description: "Choose a username to create your account." });
        } else if (res.token && res.user) {
          login(res.token, res.user);
          toast.success("Signed in!", { description: `Welcome back, ${res.user.userName}!` });
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error("Auth error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  // Google login via popup — gets the id_token from Google
  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      // The implicit flow gives us an access_token; we need to exchange it for user info
      // and then use it as our "idToken" for the backend.
      // Actually, for simplicity, let's use the 'code' flow or fetch user info.
      // The backend expects a Google ID token. Let's fetch user info and pass the access_token.
      // We'll adjust: send the access_token to backend which will verify with Google.
      handleGoogleAuth(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error("Google login error:", error);
      toast.error("Google sign-in failed");
    },
  });

  const handleCompleteSignup = () => {
    if (pendingIdToken && valid) {
      handleGoogleAuth(pendingIdToken, true);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-12">
      <div className="auth-grid absolute inset-0 opacity-50" />
      <div className="particle left-[12%] top-[18%] size-3" />
      <div className="particle right-[16%] top-[28%] size-5 animation-delay-2" />
      <div className="particle bottom-[15%] left-[24%] size-4 animation-delay-4" />
      <Button asChild variant="ghost" className="absolute left-4 top-4 text-muted-foreground sm:left-8 sm:top-8">
        <Link to="/">
          <ArrowLeft />Back
        </Link>
      </Button>
      <section className="glass-panel relative z-10 w-full max-w-[440px] p-6 sm:p-8">
        <div className="mb-8 flex justify-center"><TradeXLogo /></div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to the market</h1>
          <p className="mt-2 text-sm text-muted-foreground">Trade without risk. Learn without limits.</p>
        </div>

        {showSignup ? (
          /* ─── Username picker (shown after Google auth for new users) ─── */
          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Choose a username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20))}
                  placeholder="marketmaven"
                  className="h-11 pr-10"
                />
                {valid && <CheckCircle2 className="absolute right-3 top-3 size-5 text-profit" />}
              </div>
              <p className="text-xs text-muted-foreground">3–20 characters, letters and numbers only.</p>
            </div>
            <Button
              onClick={handleCompleteSignup}
              disabled={!valid || loading}
              className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
            </Button>
          </div>
        ) : (
          /* ─── Sign In / Sign Up tabs ─── */
          <Tabs defaultValue="signin" className="mt-7">
            <TabsList className="grid h-11 w-full grid-cols-2 bg-secondary/70">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <Button
                onClick={() => googleLogin()}
                disabled={loading}
                variant="outline"
                className="h-12 w-full bg-foreground text-background hover:bg-foreground/90 hover:text-background"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><GoogleMark />Sign in with Google</>}
              </Button>
              <p className="mt-5 text-center text-xs text-muted-foreground">
                By continuing, you agree to the Terms of Service.
              </p>
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <Button
                onClick={() => googleLogin()}
                disabled={loading}
                variant="outline"
                className="h-12 w-full bg-foreground text-background hover:bg-foreground/90 hover:text-background"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><GoogleMark />Continue with Google</>}
              </Button>
              <p className="mt-5 text-center text-xs text-muted-foreground">
                You'll choose a username after Google authentication.
              </p>
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-profit" />Markets operational
        </div>
      </section>
    </main>
  );
}