import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class MainErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Détecter automatiquement les erreurs de chargement de chunk (nouvelle version déployée)
    const errorStr = (error.message || "") + " " + (error.stack || "");
    const isChunkError = 
      /chunk|loading.*failed|failed.*fetch.*dynamically|dynamically.*imported/i.test(errorStr) ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      // Éviter les boucles infinies de rechargement si le réseau est réellement coupé
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('last_chunk_reload', now.toString());
        console.warn("Erreur de chargement de module (mise à jour détectée). Rechargement automatique de l'application...");
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Oups ! Une erreur est survenue.</h1>
          <button 
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
