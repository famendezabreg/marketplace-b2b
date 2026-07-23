import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { extractErrorMessage } from '../../lib/api';
import type { UserRole } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { BrandSeal } from '../../components/ui/BrandMark';

const inputClass =
  'w-full rounded-sm border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-paper-50 placeholder:text-ink-500 focus:border-signage-500 focus:outline-none';
const labelClass = 'mb-1 block font-manifest text-xs text-ink-300';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('comprador');
  const [form, setForm] = useState({
    email: '',
    password: '',
    companyName: '',
    taxId: '',
    phone: '',
    address: '',
  });

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register({ ...form, role });
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandSeal size={56} />
          <p className="font-manifest mt-4 text-3xl text-paper-50">Manifiesto</p>
          <p className="mt-1 text-sm text-ink-300">Crear cuenta</p>
        </div>

        <div className="rounded-sm border border-ink-800 bg-ink-900 p-6">
          <div className="mb-5 grid grid-cols-2 gap-2">
            {(['comprador', 'proveedor'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-sm border px-3 py-2 text-sm font-manifest transition-colors ${
                  role === r
                    ? r === 'proveedor'
                      ? 'border-signage-500 bg-signage-500/15 text-signage-400'
                      : 'border-dock-500 bg-dock-500/15 text-dock-400'
                    : 'border-ink-700 text-ink-300 hover:border-ink-500'
                }`}
              >
                {r === 'proveedor' ? 'Proveedor' : 'Comprador'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelClass}>Correo</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contrasena (min. 8 caracteres)</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={update('password')}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {role === 'proveedor' ? 'Razon social' : 'Nombre de empresa'}
              </label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={update('companyName')}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>NIT / RUC</label>
                <input
                  type="text"
                  value={form.taxId}
                  onChange={update('taxId')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Telefono</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={update('phone')}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                {role === 'proveedor' ? 'Direccion del local' : 'Direccion de entrega'}
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={update('address')}
                placeholder={
                  role === 'proveedor'
                    ? 'Donde los compradores pueden recoger sus pedidos'
                    : 'A donde quieres que te lleguen tus pedidos'
                }
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-sm border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-xs text-alert-500">
                {error}
              </p>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full">
              Crear cuenta
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-300">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="text-signage-400 hover:underline">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
