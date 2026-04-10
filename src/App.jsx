import ReadyNormLoader from '@/components/loading/ReadyNormLoader';
import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { useAuth } from '@/lib/useAuth';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Suspense, lazy, Component } from 'react';

// Global error boundary — prevents a single component crash from blanking the whole app
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 9999, padding: '10px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-load infrequently-visited top-level pages
const OrganizationDashboard = lazy(() => import('./pages/OrganizationDashboard'));
const GeneralSiteSettings = lazy(() => import('./pages/GeneralSiteSettings'));
const SOC2Dashboard = lazy(() => import('./pages/SOC2Dashboard'));
const PublicPolicies = lazy(() => import('./pages/PublicPolicies'));
const ManagerLogin = lazy(() => import('./pages/ManagerLogin.jsx'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  const isLoading = isLoadingPublicSettings || isLoadingAuth;

  // Handle auth errors after loading completes
  if (!isLoading && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'auth_required') {
      // Render ManagerLogin directly instead of redirecting (avoids infinite redirect loop)
      return <ManagerLogin />;
    }
  }

  // Extra safety: if not loading and not authenticated, show login
  if (!isLoading && !isAuthenticated) {
    console.warn("🔴 [App] Not authenticated after loading, showing login");
    return <ManagerLogin />;
  }

  // Allow authenticated users to access ManagerLogin for password reset
  const isResetMode = window.location.pathname === '/ManagerLogin' && window.location.search.includes('mode=reset');
  if (!isLoading && isResetMode) {
    return <ManagerLogin />;
  }

  return (
    <>
      {isLoading && <ReadyNormLoader />}
      {!isLoading && (
        <Suspense fallback={<ReadyNormLoader />}>
          <Routes>
          <Route path="/" element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          } />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              }
            />
          ))}
          <Route path="/OrganizationDashboard" element={
            <LayoutWrapper currentPageName="OrganizationDashboard">
              <OrganizationDashboard />
            </LayoutWrapper>
          } />
          <Route path="/GeneralSiteSettings" element={
            <LayoutWrapper currentPageName="GeneralSiteSettings">
              <GeneralSiteSettings />
            </LayoutWrapper>
          } />
          <Route path="/SOC2Dashboard" element={
            <LayoutWrapper currentPageName="SOC2Dashboard">
              <SOC2Dashboard />
            </LayoutWrapper>
          } />
          <Route path="/PublicPolicies" element={
            <PublicPolicies />
          } />
          <Route path="/ManagerLogin" element={
            <ManagerLogin />
          } />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        </Suspense>
      )}
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App