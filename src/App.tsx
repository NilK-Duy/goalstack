import { Navigate, Route, Routes } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { GoalDetailPage } from '@/pages/GoalDetailPage';
import { GoalsListPage } from '@/pages/GoalsListPage';

export default function App() {
  return (
    <div className="min-h-svh">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <Routes>
          <Route path="/" element={<GoalsListPage />} />
          <Route path="/goals/:goalId" element={<GoalDetailPage />} />
          {/* Anything else is a mistyped or stale link; the list is the one
              page that is always valid. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
