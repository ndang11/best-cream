import React, { useState } from 'react';
import Constants from 'expo-constants';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import DashboardScreen from './src/screens/DashboardScreen';

// Automatically resolve backend host IP from the Expo development server
const hostUri = Constants.expoConfig?.hostUri;
const hostIp = hostUri ? hostUri.split(':')[0] : 'localhost';
const API_URL = `http://${hostIp}:5000`;

export type AppScreen = 'splash' | 'welcome' | 'login' | 'signup' | 'dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [userEmail, setUserEmail] = useState<string>('customer@bestcream.com');

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
      />
    );
  }

  // 3. Login Screen -> Routes straight to Dashboard on login
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        apiUrl={API_URL}
        onLoginSuccess={(email) => {
          if (email) setUserEmail(email);
          setCurrentScreen('dashboard');
        }}
        onGoToSignUp={() => setCurrentScreen('signup')}
      />
    );
  }

  // 4. Sign Up Screen -> Routes straight to Dashboard on signup
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        apiUrl={API_URL}
        onSignUpSuccess={(email) => {
          if (email) setUserEmail(email);
          setCurrentScreen('dashboard');
        }}
        onGoToLogin={() => setCurrentScreen('login')}
      />
    );
  }

  // 5. Dashboard Screen (Products, Ice Creams, Pancakes, Cart, Orders & Status)
  return (
    <DashboardScreen
      apiUrl={API_URL}
      userEmail={userEmail}
      onLogout={() => setCurrentScreen('welcome')}
    />
  );
}
