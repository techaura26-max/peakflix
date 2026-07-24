import { useLayoutEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { DetailsPage } from './pages/DetailsPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { WatchPage } from './pages/WatchPage';
import { LibraryPage } from './pages/LibraryPage';
import { LegalPage } from './pages/LegalPage';

export default function App() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.key]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:type" element={<CategoryPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/title/:id" element={<DetailsPage />} />
        <Route path="/watch/:id" element={<WatchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/about" element={<LegalPage kind="about" />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />
        <Route path="/disclaimer" element={<LegalPage kind="disclaimer" />} />
        <Route path="/category/turkish-drama" element={<Navigate to="/category/korean-drama" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
