import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { VotingView } from './components/VotingView';
import { AdminView } from './components/AdminView';

function resolvePath(pathname: string): '/' | '/admin' {
  return pathname.startsWith('/admin') ? '/admin' : '/';
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<'/' | '/admin'>(() =>
    resolvePath(window.location.pathname),
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(resolvePath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: '/' | '/admin', hash?: string) => {
    const targetUrl = hash ? `${path}${hash}` : path;
    if (window.location.pathname !== path || hash) {
      window.history.pushState({}, '', targetUrl);
    }
    setCurrentPath(path);

    if (hash) {
      const id = hash.replace('#', '');
      window.setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C1613]">
      <TopBar currentPath={currentPath} onNavigate={navigate} />

      <div className="flex-1">
        {currentPath === '/admin' ? (
          <AdminView onGoToVote={() => navigate('/')} />
        ) : (
          <VotingView onGoToAdmin={() => navigate('/admin')} />
        )}
      </div>

      <footer className="border-t border-[#E7E2DA] bg-[#FAF8F5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#8A7E75]">
          <span>Concurso de Brownies · Zhibin Zheng vs. Nicolás Villegas</span>
          <a
            href={currentPath === '/admin' ? '/' : '/admin'}
            onClick={(e) => {
              e.preventDefault();
              navigate(currentPath === '/admin' ? '/' : '/admin');
            }}
            className="text-[#5C524B] hover:text-[#1C1613] hover:underline underline-offset-4"
          >
            {currentPath === '/admin' ? 'Volver a la votación pública' : 'Acceso administrador (/admin)'}
          </a>
        </div>
      </footer>
    </div>
  );
}
