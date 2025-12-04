import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { User } from "lucide-react";
import { toast } from "sonner@2.0.3";
import backgroundImage from "../assets/9b929b3f6917c71ac1f4bf505581d3d5ef8033f4.png";


interface LandingPageProps {
  onLogin: (username: string) => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname || nickname.trim().length === 0) {
      toast.error("Please enter a nickname");
      return;
    }

    if (nickname.trim().length < 2) {
      toast.error("Nickname must be at least 2 characters");
      return;
    }

    setIsLoading(true);
    
    // Simulate entry
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`Welcome, ${nickname}!`, {
        description: "Let's secure some reactors"
      });
      onLogin(nickname.trim());
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Blueprint Background Image */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/60" />

      {/* Nuclear Symbol - Top Left Corner */}
      <div className="absolute top-8 left-8 opacity-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-primary">
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <path d="M12 2 L12 8" stroke="currentColor" strokeWidth="2" />
              <path d="M12 16 L12 22" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12 L8 12" stroke="currentColor" strokeWidth="2" />
              <path d="M16 12 L22 12" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Top Section - Welcome Typography */}
      <div className="relative z-10 flex-shrink-0 pt-16 pb-8">
        <div className="flex flex-col items-center text-center space-y-6 px-6">
          {/* Lab Header */}
          <div className="inline-block bg-card/60 backdrop-blur-sm border border-border rounded px-3 py-1">
            <span className="text-xs text-primary glow-orange">LABORATORY ACCESS TERMINAL</span>
          </div>

          {/* Large Welcome Text */}
          <div className="space-y-4">
            <div className="text-[5rem] leading-none font-semibold text-foreground tracking-tight">
              Welcome <span className="text-primary">to NICSSIM</span>
            </div>
          </div>
          
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
            Nuclear Industrial Control Systems Security Simulation Platform
          </p>
          
          {/* Orange Decorative Line */}
          <div className="h-1 w-48 bg-primary rounded-full glow-orange" />

        </div>
      </div>

      {/* Middle Section - Empty to show background */}
      <div className="flex-grow" />

      {/* Bottom Section - Access Terminal */}
      <div className="relative z-10 flex-shrink-0 pb-16 pt-8">
        <div className="flex justify-center px-6">
          <Card className="bg-card/90 backdrop-blur-sm border-2 border-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl">
            {/* Terminal Header */}
            <div className="bg-primary/10 border-b border-border px-6 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-foreground">Access Terminal Online</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="px-8 py-6">
              <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
                <div>
                  <h3 className="text-lg text-foreground mb-1">Operator Identification</h3>
                  <p className="text-sm text-muted-foreground">Enter your operator nickname to access the laboratory systems</p>
                </div>

                <form onSubmit={handleStart} className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Operator Nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="pl-10 bg-secondary/20 border-border text-foreground"
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-orange-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? "Authenticating..." : "Enter Laboratory"}
                  </Button>
                </form>
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  By entering, you acknowledge compliance with nuclear safety protocols
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}