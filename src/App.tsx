import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import BotBuilder from './BotBuilder';
import Charts from './Charts';
import Analysis from './Analysis';
import FreeBots from './FreeBots';
import Preloader from './components/Preloader';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Preloader />;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bot-builder" element={<BotBuilder />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/free-bots" element={<FreeBots />} />
        </Routes>
      </Layout>
    </Router>
  );
}
