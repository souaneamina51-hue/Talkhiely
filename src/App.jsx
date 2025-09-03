import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import SummaryInterface from './components/SummaryInterface';
import SubscriptionButton from './components/SubscriptionButton';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SummaryInterface />} />
        <Route path="/subscribe" element={<SubscriptionButton />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;