import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Lock, LogIn, User, UserPlus } from 'lucide-react';
import { login, register, type AccountUser } from '../services/account';
import loginBg from '../assets/login-bg.jpg';

interface AuthPageProps {
  registrationOpen: boolean;
  notice?: string | null;
  onAuthenticated: (user: AccountUser) => void;
}

const labelCls = 'flex items-center gap-2 mb-2 font-display text-lg text-[#f6e3c0]';
const fieldWrap =
  'flex items-center gap-2 h-12 rounded-xl border border-[#a77bd8]/60 bg-white/[0.06] px-4 transition-colors focus-within:border-[#e8c58f] focus-within:bg-white/[0.09]';
const inputCls =
  'w-full bg-transparent text-[15px] text-[#f4ecff] placeholder:text-[#a58bd0] focus:outline-none';

/** Tela de entrada: fundo ilustrado (mobile-first) e cartão roxo com moldura dourada. */
export function AuthPage({ registrationOpen, notice, onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [invite, setInvite] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError(null);
    setShowForgot(false);
    setPassword('');
    setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (isRegister) {
      if (password !== confirm) {
        setError('As senhas não conferem.');
        return;
      }
      if (password.length < 8) {
        setError('A senha deve ter pelo menos 8 caracteres.');
        return;
      }
    }

    setBusy(true);
    try {
      const user = isRegister
        ? await register(username.trim(), password, invite.trim())
        : await login(username.trim(), password);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.');
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex justify-center bg-[#1c0a32] overflow-x-hidden">
      {/* Em telas largas, uma cópia borrada do fundo preenche as laterais */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
        style={{ backgroundImage: `url(${loginBg})` }}
      />

      <div
        className="relative w-full max-w-[460px] min-h-screen bg-[#331f48] px-5 pb-10"
        // espaço para o logo desenhado no fundo
        style={{ paddingTop: 'min(69vw, 318px)' }}
      >
        {/* ilustração de fundo, com degradê no pé para não aparecer a emenda */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 aspect-[941/1614] bg-cover bg-top"
          style={{ backgroundImage: `url(${loginBg})` }}
        >
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[#331f48]" />
        </div>

        <h1 className="sr-only">Zimpy Hub RPG</h1>

        {/* moldura dourada */}
        <div className="relative z-10 rounded-[28px] p-[1.5px] bg-gradient-to-b from-[#ecc891]/85 via-[#b98a5e]/45 to-[#ecc891]/75 shadow-[0_12px_44px_rgba(15,4,35,0.65)]">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-[26.5px] bg-[#2a1250]/90 backdrop-blur-md px-6 pt-7 pb-6"
          >
            {notice && !error && (
              <div className="mb-4 rounded-xl border border-[#e8c58f]/40 bg-[#e8c58f]/10 px-3.5 py-2.5 text-xs text-[#f6e3c0]">
                {notice}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-rose-400/45 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-100"
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              <label className="block">
                <span className={labelCls}>
                  <User className="w-5 h-5 text-[#f3d9a8]" aria-hidden="true" />
                  Usuário
                </span>
                <span className={fieldWrap}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={20}
                    placeholder="Seu usuário"
                    className={inputCls}
                    required
                  />
                </span>
                {isRegister && (
                  <span className="block mt-1.5 text-[11px] text-[#b9a2dd]">
                    3 a 20 caracteres: letras, números ou _
                  </span>
                )}
              </label>

              <label className="block">
                <span className={labelCls}>
                  <Lock className="w-5 h-5 text-[#f3d9a8]" aria-hidden="true" />
                  Senha
                </span>
                <span className={fieldWrap}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    maxLength={128}
                    placeholder={isRegister ? 'Mínimo 8 caracteres' : 'Sua senha'}
                    className={inputCls}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="text-[#b9a2dd] hover:text-[#f4ecff] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </span>
              </label>

              {isRegister && (
                <>
                  <label className="block">
                    <span className={labelCls}>
                      <Lock className="w-5 h-5 text-[#f3d9a8]" aria-hidden="true" />
                      Confirmar senha
                    </span>
                    <span className={fieldWrap}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        maxLength={128}
                        placeholder="Repita a senha"
                        className={inputCls}
                        required
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className={labelCls}>
                      <KeyRound className="w-5 h-5 text-[#f3d9a8]" aria-hidden="true" />
                      Código de convite
                    </span>
                    <span className={fieldWrap}>
                      <input
                        type="text"
                        value={invite}
                        onChange={(e) => setInvite(e.target.value)}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Peça ao administrador"
                        className={inputCls}
                        required
                      />
                    </span>
                    {!registrationOpen && (
                      <span className="block mt-1.5 text-[11px] text-[#f3d9a8]">
                        O cadastro está desativado neste servidor.
                      </span>
                    )}
                  </label>
                </>
              )}
            </div>

            {!isRegister && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-sm text-[#d3b3ff] underline underline-offset-2 hover:text-white transition-colors cursor-pointer"
                >
                  Esqueci a senha
                </button>
                {showForgot && (
                  <p className="mt-2 text-xs text-[#cdb9ec]">
                    Peça ao administrador para redefinir a sua senha. Ele gera uma nova e você passa a usá-la no login.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !username || !password}
              className="mt-5 w-full h-14 inline-flex items-center justify-center gap-3 rounded-full border border-[#d9b8ff]/60 bg-gradient-to-b from-[#9a5fe0] to-[#5a2aa5] text-[#fbeed6] font-display text-xl shadow-[0_6px_22px_rgba(120,60,200,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span aria-hidden="true" className="text-[#f3d9a8] text-base">
                  ✦
                </span>
              )}
              {isRegister ? 'Criar conta' : 'Entrar'}
              {!busy && (
                <span aria-hidden="true" className="text-[#f3d9a8] text-base">
                  ✦
                </span>
              )}
            </button>

            <div className="my-4 flex items-center gap-3 text-sm text-[#cdb9ec]" aria-hidden="true">
              <span className="h-px flex-1 bg-[#a77bd8]/40" />
              ou
              <span className="h-px flex-1 bg-[#a77bd8]/40" />
            </div>

            <button
              type="button"
              onClick={switchMode}
              className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#cfa8ff]/65 text-[#f4ecff] font-display text-lg transition-colors hover:bg-white/[0.08] cursor-pointer"
            >
              {isRegister ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {isRegister ? 'Já tenho conta' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
