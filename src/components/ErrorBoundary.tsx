import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { clearAllPantosStorage } from '../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReset = () => {
    clearAllPantosStorage();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Terjadi kesalahan sistem yang tidak terduga.';
      const isQuotaError =
        errorMessage.includes('QuotaExceededError') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('Storage');

      return (
        <div className="min-h-screen bg-[#161311] text-[#F2EDE4] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#3D352E] bg-[#1D1916] p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-[#F2EDE4] tracking-tight">
                {isQuotaError ? 'Memori Penyimpanan Browser Penuh' : 'Terjadi Gangguan Tampilan'}
              </h2>
              <p className="text-xs sm:text-sm text-[#9C948A] leading-relaxed">
                {isQuotaError
                  ? 'Browser Anda kehabisan kuota penyimpanan lokal (localStorage). Klik tombol di bawah untuk membersihkan cache dan memulihkan aplikasi secara normal.'
                  : 'Aplikasi mengalami kendala saat memuat data di browser. Anda dapat memuat ulang atau mereset cache untuk kembali normal.'}
              </p>
            </div>

            {/* Error Message Box */}
            <div className="rounded-xl border border-[#332C25] bg-[#161311] p-3 text-left">
              <p className="text-[11px] font-mono text-red-400 break-words">
                {errorMessage}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#2A241E] border border-[#3D352E] hover:border-[#E8B33D]/50 hover:bg-[#332C25] px-4 py-2.5 text-xs font-bold text-[#F2EDE4] transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] px-5 py-2.5 text-xs font-black shadow-lg shadow-[#E8B33D]/10 transition-transform active:scale-95 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Bersihkan Cache &amp; Buka Kembali</span>
              </button>
            </div>

            <p className="text-[10px] text-[#6E655C]">
              Laga Amal Pantos MLBB • Data Anda di database Supabase tetap aman.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
