import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../i18n';
import { isRtlLanguage } from '../i18n/languages';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PeakFlix render error', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page-shell error-page" dir={isRtlLanguage(i18n.resolvedLanguage) ? 'rtl' : 'ltr'}>
        <h1>{i18n.t('somethingWrong')}</h1>
        <p>{i18n.t('unexpectedError')}</p>
        <a className="primary-btn" href="./">{i18n.t('backHome')}</a>
      </main>
    );
  }
}
