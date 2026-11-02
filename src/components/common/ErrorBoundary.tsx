import { Component, ErrorInfo, ReactNode } from 'react';
import { ArrowLeft, ArrowClockwise, WarningOctagon } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#000000] text-[#F5F5F7] flex items-center justify-center p-4">
          <div className="astryx-card w-full max-w-md p-6 sm:p-8 bg-[#161618] border border-white/10 rounded-3xl shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <WarningOctagon size={32} weight="fill" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Временная ошибка отображения
            </h2>

            <p className="text-xs text-[#86868B] leading-relaxed max-w-xs mx-auto">
              Интерфейс столкнулся с непредвиденной ситуацией. Все ваши данные и настройки сохранены в безопасности.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-md"
              >
                <ArrowClockwise size={16} weight="bold" />
                <span>Обновить</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/15 active:scale-95 transition-all border border-white/10"
              >
                <ArrowLeft size={16} />
                <span>На главную</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
