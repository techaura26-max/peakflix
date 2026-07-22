import { KeyRound, Mail, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, getSecurityQuestions, resetPassword, verifySecurityAnswer } from '../services/authApi';

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'identify' | 'answer' | 'reset'>('identify');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [passwordResetToken, setPasswordResetToken] = useState('');
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [questions, setQuestions] = useState<Array<{ id: number; question: string }>>([]);

  useEffect(() => {
    getSecurityQuestions().then((result) => {
      if (Array.isArray(result.items) && result.items.length) {
        const nextQuestions = (result.items as Array<{ id: number; question: string }>);
        setQuestions(nextQuestions);
      }
    }).catch(() => undefined);
  }, []);

  const resetRecoveryState = () => {
    setRecoveryToken('');
    setPasswordResetToken('');
    setQuestionId(null);
    setAnswer('');
    setPassword('');
    setConfirmPassword('');
    setStep('identify');
  };

  const recover = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await forgotPassword(identifier);
      if (result.user?.security_question_id && result.recoveryToken) {
        setRecoveryToken(result.recoveryToken);
        setQuestionId(result.user.security_question_id);
        setStep('answer');
      } else {
        setSuccess('If that account exists, recovery details will be provided.');
        setStep('identify');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to recover account.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await verifySecurityAnswer(recoveryToken, answer);
      if (result.passwordResetToken) {
        setPasswordResetToken(result.passwordResetToken);
        setStep('reset');
      } else {
        setError('The security answer did not match.');
      }
    } catch (e: any) {
      setError(e.message || 'Your recovery session has expired.');
      resetRecoveryState();
    } finally {
      setLoading(false);
    }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    if (password.length < 8 || password !== confirmPassword) {
      setError('Password must be at least 8 characters and match confirmation.');
      setLoading(false);
      return;
    }
    try {
      await resetPassword(passwordResetToken, password, confirmPassword);
      setSuccess('Password updated. You can sign in with your new password.');
      resetRecoveryState();
      setIdentifier('');
    } catch (e: any) {
      setError(e.message || 'Unable to reset password.');
      resetRecoveryState();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={step === 'identify' ? recover : step === 'answer' ? verify : reset} style={{ maxWidth: 480 }}>
        <span className="eyebrow">PASSWORD RECOVERY</span>
        <h1>Reset your password</h1>
        <p>Use your email or username to recover your account securely.</p>
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        {step === 'identify' ? (
          <label>
            <span>Email or username</span>
            <div><Search size={18} /><input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></div>
          </label>
        ) : null}
        {step === 'answer' && questionId ? (
          <>
            <label>
              <span>Security question</span>
              <div><ShieldCheck size={18} /><input value={questions.find((item) => item.id === questionId)?.question || ''} readOnly /></div>
            </label>
            <label>
              <span>Security answer</span>
              <div><Mail size={18} /><input value={answer} onChange={(e) => setAnswer(e.target.value)} required /></div>
            </label>
          </>
        ) : null}
        {step === 'reset' ? (
          <>
            <label>
              <span>New password</span>
              <div><KeyRound size={18} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            </label>
            <label>
              <span>Confirm password</span>
              <div><KeyRound size={18} /><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
            </label>
          </>
        ) : null}
        <button className="primary-btn" disabled={loading}>{loading ? 'Working...' : step === 'identify' ? 'Continue' : step === 'answer' ? 'Verify answer' : 'Reset password'}</button>
        <p className="muted" style={{ textAlign: 'center' }}><Link to="/login">Back to sign in</Link></p>
      </form>
    </div>
  );
}
