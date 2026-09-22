import React from 'react';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

export default function AppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthLoadingScreen
          message="Updating SERP Radar Data..."
          subMessage="Grounding competitor movements and rankings against Google Web & Maps..."
        />
      </div>
    </div>
  );
}
