import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { extractErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Form';
import { ErrorBanner } from '../../components/ui/Feedback';
import { BrandSeal } from '../../components/ui/BrandMark';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandSeal size={56} />
          <p className="font-manifest mt-4 text-3xl text-paper-50">Manifiesto</p>
          <p className="mt-1 text-sm text-ink-300">Marketplace B2B</p>
        </div>

        <div className="corner-marks rounded-sm border border-ink-800 bg-ink-900 p-6">
          <p className="font-manifest mb-5 text-sm text-signage-400">
            Iniciar sesion
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Correo" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sm border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-paper-50 placeholder:text-ink-500 focus:border-signage-500 focus:outline-none"
                placeholder="tucorreo@empresa.com"
              />
            </Field>

            <Field label="Contrasena" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-paper-50 placeholder:text-ink-500 focus:border-signage-500 focus:outline-none"
                placeholder="••••••••"
              />
            </Field>

            {error && <ErrorBanner message={error} />}

            <Button type="submit" isLoading={isLoading} className="w-full">
              Entrar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-300">
          No tienes cuenta?{' '}
          <Link to="/register" className="text-signage-400 hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
