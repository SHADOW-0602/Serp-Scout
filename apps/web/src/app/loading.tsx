import React from 'react';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <AuthLoadingScreen
          message="Loading Serp-Scout..."
          subMessage="Fetching autonomous SERP radar intelligence and insights..."
        />
      </div>
    </div>
  );
}
