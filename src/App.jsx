import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import { ThemeProvider } from './lib/ThemeContext';
import { LanguageProvider } from './lib/LanguageContext';
import SplashScreen from './components/layout/SplashScreen';
import OnboardingSlides from './components/layout/OnboardingSlides';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const FoodLog = lazy(() => import('./pages/FoodLog'));
const WaterPage = lazy(() => import('./pages/WaterPage'));
const History = lazy(() => import('./pages/History'));
const Profile = lazy(() => import('./pages/Profile'));
const WeightTracker = lazy(() => import('./pages/WeightTracker'));
const Gamification = lazy(() => import('./pages/Gamification'));
const MealPlan = lazy(() => import('./pages/MealPlan'));
const PageNotFound = lazy(() => import('./lib/PageNotFound'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <>
      <OnboardingSlides />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<FoodLog />} />
            <Route path="/water" element={<WaterPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/weight" element={<WeightTracker />} />
            <Route path="/gamification" element={<Gamification />} />
            <Route path="/meal-plan" element={<MealPlan />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};


function App() {

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SplashScreen />
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
