import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
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
          toast.info("One more step!", {
            description: "Choose a username to create your account.",
          });
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

  // GoogleLogin returns a signed ID token in `credential`, matching the
  // backend's google-auth-library verification contract.
  const googleButton = (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse.credential) {
          handleGoogleAuth(credentialResponse.credential);
        } else {
          toast.error("Google sign-in did not return an ID token");
        }
      }}
      onError={() => toast.error("Google sign-in failed")}
      theme="filled_black"
      size="large"
      width="376"
      text="continue_with"
    />
  );

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
      <Button
        asChild
        variant="ghost"
        className="absolute left-4 top-4 text-muted-foreground sm:left-8 sm:top-8"
      >
        <Link to="/">
          <ArrowLeft />
          Back
        </Link>
      </Button>
      <section className="glass-panel relative z-10 w-full max-w-[440px] p-6 sm:p-8">
        <div className="mb-8 flex justify-center">
          <TradeXLogo />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to the market</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Trade without risk. Learn without limits.
          </p>
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
                  onChange={(event) =>
                    setUsername(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20))
                  }
                  placeholder="marketmaven"
                  className="h-11 pr-10"
                />
                {valid && <CheckCircle2 className="absolute right-3 top-3 size-5 text-profit" />}
              </div>
              <p className="text-xs text-muted-foreground">
                3–20 characters, letters and numbers only.
              </p>
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
              <div className={loading ? "pointer-events-none opacity-60" : ""}>
                {loading ? (
                  <Button disabled className="h-10 w-full">
                    <Loader2 className="animate-spin" />
                  </Button>
                ) : (
                  googleButton
                )}
              </div>
              <p className="mt-5 text-center text-xs text-muted-foreground">
                By continuing, you agree to the Terms of Service.
              </p>
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <div className={loading ? "pointer-events-none opacity-60" : ""}>
                {loading ? (
                  <Button disabled className="h-10 w-full">
                    <Loader2 className="animate-spin" />
                  </Button>
                ) : (
                  googleButton
                )}
              </div>
              <p className="mt-5 text-center text-xs text-muted-foreground">
                You'll choose a username after Google authentication.
              </p>
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-profit" />
          Markets operational
        </div>
      </section>
    </main>
  );
}
