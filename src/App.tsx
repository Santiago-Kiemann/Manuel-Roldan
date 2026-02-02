import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GestionPage } from '@/components/gestion/GestionPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/gestion" replace />} />
        <Route path="/gestion" element={<GestionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
