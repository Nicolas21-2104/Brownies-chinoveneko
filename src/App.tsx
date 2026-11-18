import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { VotingView } from './components/VotingView';
import { AdminView } from './components/AdminView';
import type { VoteLanguage } from './types/contest';

function resolvePath(pathname: string): '/' | '/admin' {
  return pathname.startsWith('/admin') ? '/admin' : '/';
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<'/' | '/admin'>(() =>
    resolvePath(window.location.pathname),
  );
  const [language, setLanguage] = useState<VoteLanguage>(() => {
    return sessionStorage.getItem('brownie_lang') === 'zh' ? 'zh' : 'es';
  });

  const handleSetLanguage = (nextLang: VoteLanguage) => {
    setLanguage(nextLang);
    sessionStorage.setItem('brownie_lang', nextLang);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(resolvePath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (currentPath === '/admin') {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow';
    } else if (robotsMeta) {
      robotsMeta.remove();
    }
  }, [currentPath]);

  useEffect(() => {
    const isZh = currentPath === '/' && language === 'zh';
    document.documentElement.lang = isZh ? 'zh-CN' : 'es';
    document.title = isZh
      ? '布朗尼品鉴大赛 — 郑志斌 对决 尼古拉斯·维列加斯'
      : 'Concurso de Brownies — Zhibin Zheng vs. Nicolás Villegas';
  }, [currentPath, language]);

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

  const isZhPublic = currentPath === '/' && language === 'zh';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isZhPublic
          ? 'bg-[#1B0C0B] text-[#F9EEDB]'
          : 'bg-[#FAF8F5] text-[#1C1613]'
      }`}
    >
      <TopBar
        currentPath={currentPath}
        language={language}
        onNavigate={navigate}
      />

      <div className="flex-1">
        {currentPath === '/admin' ? (
          <AdminView onGoToVote={() => navigate('/')} />
        ) : (
          <VotingView language={language} onChangeLanguage={handleSetLanguage} />
        )}
      </div>

      <footer
        className={`border-t transition-colors duration-300 ${
          isZhPublic
            ? 'border-[#D99B26]/25 bg-[#1B0C0B]'
            : 'border-[#E7E2DA] bg-[#FAF8F5]'
        }`}
      >
        <div
          className={`max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs ${
            isZhPublic ? 'text-[#C9B086]' : 'text-[#8A7E75]'
          }`}
        >
          <span>
            {isZhPublic
              ? '御膳布朗尼品鉴会 · 郑志斌 对决 尼古拉斯·维列加斯'
              : 'Concurso de Brownies · Zhibin Zheng vs. Nicolás Villegas'}
          </span>
          {currentPath === '/admin' && (
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
              className="text-[#5C524B] hover:text-[#1C1613] hover:underline underline-offset-4"
            >
              Volver a la votación pública
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
