import { SignUp, ClerkLoading, ClerkLoaded } from '@clerk/nextjs';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

export default function SignUpPage() {
  return (
    <div className="w-full">
      <ClerkLoading>
        <AuthLoadingScreen
          message="Preparing Serp-Scout Account..."
          subMessage="Setting up your zero-trust workspace & competitive SERP intelligence tools..."
        />
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'shadow-2xl shadow-indigo-950/10 border border-slate-200/90 rounded-2xl bg-white/95 backdrop-blur-xl',
              primaryButton:
                'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold shadow-md shadow-indigo-500/20',
              headerTitle: 'text-slate-900 font-extrabold',
              headerSubtitle: 'text-slate-500 text-xs',
            },
          }}
        />
      </ClerkLoaded>
    </div>
  );
}
