import React, { useState } from 'react';
import Constants from 'expo-constants';
import { LanguageProvider } from './src/context/LanguageContext';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import StaffScreen from './src/screens/StaffScreen';
import SalesScreen from './src/screens/SalesScreen';

// Automatically resolve backend host IP from the Expo development server
const hostUri = Constants.expoConfig?.hostUri;
const hostIp = hostUri ? hostUri.split(':')[0] : 'localhost';
const API_URL = `http://${hostIp}:5000`;

export type AppScreen = 'splash' | 'welcome' | 'login' | 'signup' | 'dashboard' | 'admin' | 'admin-login' | 'staff' | 'sales';

function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [userEmail, setUserEmail] = useState<string>('customer@bestcream.com');
  const [userName, setUserName] = useState<string>('Sweet Tooth');
  const [userRole, setUserRole] = useState<'admin' | 'sales' | 'staff' | 'customer'>('customer');
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  const handleGlobalLogout = () => {
    setUserRole('customer');
    setUserEmail('customer@bestcream.com');
    setUserName('Sweet Tooth');
    setCurrentScreen('welcome');
  };
  // 1. Splash Screen (8-second branded entrance)
  if (currentScreen === 'splash') {
    return <SplashScreen onFinish={() => setCurrentScreen('welcome')} />;
  }

  // 2. Welcome Landing Screen (Get Started with Login or Sign Up)
  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        onGoToLogin={() => setCurrentScreen('login')}
        onGoToSignUp={() => setCurrentScreen('signup')}
        onGoToAdminLogin={() => setCurrentScreen('admin-login')}
      />
    );
  }

  // 3. Login Screen -> Automatically routes based on user's authorized role
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        apiUrl={API_URL}
        onLoginSuccess={(user) => {
          if (user.email) setUserEmail(user.email);
          if (user.name) setUserName(user.name);
          const role = user.role || 'customer';
          setUserRole(role as any);
          setIsNewUser(false);

          if (role === 'admin') {
            setCurrentScreen('admin');
          } else if (role === 'sales') {
            setCurrentScreen('sales');
          } else if (role === 'staff') {
            setCurrentScreen('staff');
          } else {
            setCurrentScreen('dashboard');
          }
        }}
        onGoToSignUp={() => setCurrentScreen('signup')}
        onGoToAdminLogin={() => setCurrentScreen('admin-login')}
      />
    );
  }

  // 4. Sign Up Screen -> Routes straight to Dashboard with "Welcome [user name]"
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        apiUrl={API_URL}
        onSignUpSuccess={(user) => {
          if (user.email) setUserEmail(user.email);
          if (user.name) setUserName(user.name);
          setUserRole('customer');
          setIsNewUser(true);
          setCurrentScreen('dashboard');
        }}
        onGoToLogin={() => setCurrentScreen('login')}
      />
    );
  }

  // 5. Admin Login Screen — Staff/Manager PIN & Supabase Authentication
  if (currentScreen === 'admin-login') {
    return (
      <AdminLoginScreen
        apiUrl={API_URL}
        onAdminLoginSuccess={(admin) => {
          if (admin.name) setUserName(admin.name);
          if (admin.email) setUserEmail(admin.email);
          setUserRole('admin');
          setCurrentScreen('admin');
        }}
        onBack={() => setCurrentScreen('welcome')}
      />
    );
  }

  // 6. Admin Screen — Protected route for authorized store administrators
  if (currentScreen === 'admin') {
    if (userRole !== 'admin') {
      // Guard: non-admins cannot access admin dashboard
      return (
        <AdminLoginScreen
          apiUrl={API_URL}
          onAdminLoginSuccess={(admin) => {
            if (admin.name) setUserName(admin.name);
            if (admin.email) setUserEmail(admin.email);
            setUserRole('admin');
            setCurrentScreen('admin');
          }}
          onBack={() => setCurrentScreen('welcome')}
        />
      );
    }
    return (
      <AdminScreen
        apiUrl={API_URL}
        adminName={userName}
        onLogout={handleGlobalLogout}
      />
    );
  }

  // 7. Sales Screen — Protected route for sales personnel (cashier / counter rep)
  if (currentScreen === 'sales') {
    if (userRole !== 'sales') {
      // Guard: only sales or admin role can access this screen
      return (
        <LoginScreen
          apiUrl={API_URL}
          onLoginSuccess={(user) => {
            if (user.email) setUserEmail(user.email);
            if (user.name) setUserName(user.name);
            const role = user.role || 'customer';
            setUserRole(role as any);
            if (role === 'admin') setCurrentScreen('admin');
            else if (role === 'sales') setCurrentScreen('sales');
            else setCurrentScreen('dashboard');
          }}
          onGoToSignUp={() => setCurrentScreen('signup')}
          onGoToAdminLogin={() => setCurrentScreen('admin-login')}
        />
      );
    }
    return (
      <SalesScreen
        apiUrl={API_URL}
        salesName={userName}
        salesEmail={userEmail}
        onLogout={handleGlobalLogout}
      />
    );
  }

  // 8. Staff Screen — Kitchen & fulfillment tickets
  if (currentScreen === 'staff') {
    return (
      <StaffScreen
        apiUrl={API_URL}
        staffName={userName}
        onLogout={handleGlobalLogout}
      />
    );
  }

  // 9. Dashboard Screen (Products, Ice Creams, Pancakes, Cart, Orders & Status)
  return (
    <DashboardScreen
      apiUrl={API_URL}
      userName={userName}
      userEmail={userEmail}
      isNewUser={isNewUser}
      onLogout={handleGlobalLogout}
    />
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
