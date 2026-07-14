import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './user-first.css';
import './foundation.css';
import './report.css';
import './career.css';
import './product-suite.css';
import './utility.css';
import './dynamics.css';
import './energy.css';
import './energy-audit.css';
import './strength.css';
import './interpretation.css';

interface AppErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Mingjing application error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ maxWidth: 760, margin: '64px auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>命镜没有成功载入</h1>
        <p>页面遇到了浏览器权限或运行环境错误，但不会再停留在空白页。</p>
        <pre style={{ whiteSpace: 'pre-wrap', padding: 16, border: '1px solid #d6d0c4', borderRadius: 12 }}>
          {this.state.error.message}
        </pre>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 18px', cursor: 'pointer' }}>
          重新载入
        </button>
      </main>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
