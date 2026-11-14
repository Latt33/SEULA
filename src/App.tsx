import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Landing } from './pages/Landing';
import { Check } from './pages/Check';
import { Clinician } from './pages/Clinician';
import { Region } from './pages/Region';
import { Impact } from './pages/Impact';
import { Evidence } from './pages/Evidence';
import { Pilot } from './pages/Pilot';
import { SessionProvider } from './store/session';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <ScrollTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/check" element={<Check />} />
          <Route path="/clinician" element={<Clinician />} />
          <Route path="/region" element={<Region />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/pilot" element={<Pilot />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  );
}
