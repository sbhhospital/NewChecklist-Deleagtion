import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#387f39] to-emerald-400 text-white flex items-center justify-center text-xl font-black mb-3 shadow-lg shadow-emerald-950/40">
            SBH
          </div>
          
          <h2 className="text-lg font-bold text-emerald-400 mb-1">SBH Diagnostics & Recovery</h2>
          <p className="text-[11px] text-slate-300 max-w-xs mb-3">
            Dashboard initialization details:
          </p>

          {/* Display exact JS Exception Message */}
          <div className="w-full max-w-sm bg-slate-900/90 border border-red-500/40 rounded-xl p-3 mb-4 text-left overflow-auto max-h-48 text-[10px] font-mono text-red-300 shadow-inner">
            <div className="font-bold text-red-400 mb-1">Error Message:</div>
            {this.state.error ? this.state.error.toString() : "Unknown Error"}
            {this.state.errorInfo?.componentStack && (
              <div className="mt-2 text-[9px] text-slate-400 border-t border-slate-800 pt-1">
                <div className="font-bold text-slate-300 mb-0.5">Component Stack:</div>
                {this.state.errorInfo.componentStack.substring(0, 300)}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.hash = "#/login";
              window.location.reload();
            }}
            className="px-5 py-2 bg-gradient-to-r from-[#387f39] to-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all"
          >
            Reset & Re-login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
