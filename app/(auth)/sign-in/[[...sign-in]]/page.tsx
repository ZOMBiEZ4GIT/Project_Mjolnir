import { SignIn } from "@clerk/nextjs";
import { AnimatedGradient } from "@/components/effects/animated-gradient";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background">
      <AnimatedGradient variant="auth" />
      <div className="relative z-10">
        <SignIn />
      </div>
    </div>
  );
}
