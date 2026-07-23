import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PeakFlix render error', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const ar = document.documentElement.lang === 'ar';
    return (
      <main className="page-shell error-page" dir={ar ? 'rtl' : 'ltr'}>
        <h1>{ar ? 'حدث خطأ' : 'Something went wrong'}</h1>
        <p>{ar ? 'واجهت الصفحة خطأ غير متوقع. يمكنك العودة للرئيسية والمحاولة مجددًا بأمان.' : 'The page hit an unexpected error. You can safely return home and try again.'}</p>
        <a className="primary-btn" href="./">{ar ? 'العودة للرئيسية' : 'Back to home'}</a>
      </main>
    );
  }
}
