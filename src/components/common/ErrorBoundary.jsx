import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error captured by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = '#home';
    window.location.reload();
  };

  handleResetState = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.hash = '#home';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)',
            border: '1px solid #e2e8f0',
            padding: '36px 32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h1 style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 10px',
              letterSpacing: '-0.02em'
            }}>
              Something went wrong
            </h1>

            <p style={{
              fontSize: '14.5px',
              color: '#64748b',
              lineHeight: '1.6',
              margin: '0 0 24px'
            }}>
              The application encountered an unexpected issue while updating the screen. Your data and account remain safe.
            </p>

            {this.state.error?.message && (
              <div style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '24px',
                fontSize: '12.5px',
                color: '#475569',
                textAlign: 'left',
                fontFamily: 'monospace',
                overflowX: 'auto',
                border: '1px solid #e2e8f0'
              }}>
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '14.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
              >
                <RefreshCw size={16} /> Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                <Home size={16} /> Return to Marketplace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
