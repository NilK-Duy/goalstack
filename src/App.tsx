import { useEffect } from 'react';
import { useGoalStore } from '@/stores/goalStore';
import GoalForm from '@/components/GoalForm';
import Timeline from '@/components/Timeline';
import Header from '@/components/Header';
import './App.css';

function App() {
  const { goal, loadFromStorage } = useGoalStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="app">
      <Header />
      <main className="container">
        {!goal ? <GoalForm /> : <Timeline />}
      </main>
    </div>
  );
}

export default App;
