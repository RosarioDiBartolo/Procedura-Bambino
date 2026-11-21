import { Component, type ReactNode } from 'react';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="error-screen" role="alert">
      <img src="/brand/utin-rodolico.png" alt="UTIN e Neonatologia" />
      <h1>La simulazione si è interrotta</h1>
      <p>Ricarica la pagina per provare a riprendere la sessione salvata in questa scheda. Gli ultimi eventi potrebbero non essere stati conservati.</p>
      <button onClick={() => window.location.reload()}>Ricarica la pagina</button>
      <p>Se il problema si ripete, chiudi l’app e segnala il passaggio in cui è avvenuto, senza inviare dati di pazienti.</p>
      <small>Prototipo didattico · non validato per uso assistenziale</small>
    </main>;
  }
}
