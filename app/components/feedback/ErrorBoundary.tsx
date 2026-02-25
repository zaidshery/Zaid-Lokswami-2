'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lokswami-red/10 flex items-center justify-center">
              <AlertTriangle size={32} className="text-lokswami-red" />
            </div>
            <h2 className="text-xl font-bold text-lokswami-white mb-2">
              कुछ गलत हो गया
            </h2>
            <p className="text-lokswami-text-secondary mb-6">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-lokswami-red text-white rounded-xl font-medium hover:bg-lokswami-red/90 transition-colors"
            >
              <RefreshCw size={18} />
              पुनः प्रयास करें
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
