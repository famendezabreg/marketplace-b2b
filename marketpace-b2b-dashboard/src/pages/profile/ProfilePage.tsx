import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Buyer, Provider } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card, Field, Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { RoleBadge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

type Profile = Provider | Buyer;

export function ProfilePage() {
  const { user, profileId, logout } = useAuthStore();
  const isProvider = user?.role === 'proveedor';
  const endpoint = isProvider ? '/providers' : '/buyers';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [addressField, setAddressField] = useState('');
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    api
      .get<Profile>(`${endpoint}/${profileId}`)
      .then((res) => {
        setProfile(res.data);
        setCompanyName(res.data.companyName);
        setTaxId(res.data.taxId ?? '');
        setPhone(res.data.phone ?? '');
        setAddressField(
          'address' in res.data ? res.data.address ?? '' : (res.data as Buyer).shippingAddress ?? '',
        );
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const payload = isProvider
        ? { companyName, taxId, phone, address: addressField }
        : { companyName, taxId, phone, shippingAddress: addressField };
      await api.patch(`${endpoint}/${profileId}`, payload);
      setSaved(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await api.delete(`${endpoint}/${profileId}`);
      logout();
    } catch (err) {
      setError(extractErrorMessage(err));
      setConfirmingDeactivate(false);
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-xl">
      <p className="font-manifest text-xs text-signage-600">Cuenta</p>
      <h1 className="font-manifest text-3xl text-ink-900">Mi perfil</h1>

      <div className="mt-3 flex items-center gap-2">
        <RoleBadge role={user!.role} />
        <span className="text-sm text-ink-500">{user?.email}</span>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {!profile ? (
        <Card className="mt-6 p-5">
          <p className="text-sm text-ink-500">No se encontro un perfil asociado.</p>
        </Card>
      ) : (
        <Card className="mt-6 p-5">
          <form onSubmit={handleSave} className="space-y-4">
            <Field label={isProvider ? 'Razon social' : 'Nombre de empresa'} htmlFor="pf-name">
              <Input
                id="pf-name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </Field>
            <Field label="NIT / RUC" htmlFor="pf-tax">
              <Input id="pf-tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </Field>
            <Field label="Telefono" htmlFor="pf-phone">
              <Input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field
              label={isProvider ? 'Direccion' : 'Direccion de envio'}
              htmlFor="pf-address"
            >
              <Input
                id="pf-address"
                value={addressField}
                onChange={(e) => setAddressField(e.target.value)}
              />
            </Field>

            {saved && (
              <p className="rounded-sm border border-ok-500/40 bg-ok-500/10 px-3 py-2 text-xs text-ok-600">
                Cambios guardados.
              </p>
            )}

            <Button type="submit" isLoading={saving}>
              Guardar cambios
            </Button>
          </form>
        </Card>
      )}

      <Card className="mt-4 border-alert-500/30 p-5">
        <p className="font-manifest text-sm text-alert-600">Zona de riesgo</p>
        <p className="mt-1 text-xs text-ink-500">
          Desactivar tu cuenta te impide iniciar sesion. Tu historial de ordenes y
          productos se conserva por integridad de los registros.
        </p>
        <Button
          variant="danger"
          onClick={() => setConfirmingDeactivate(true)}
          className="mt-3"
        >
          Desactivar mi cuenta
        </Button>
      </Card>

      {confirmingDeactivate && (
        <ConfirmModal
          title="Desactivar tu cuenta?"
          message="No podras iniciar sesion de nuevo. Tu historial de productos/ordenes se conserva. Esta accion la debe revertir un administrador."
          confirmLabel="Desactivar cuenta"
          isLoading={deactivating}
          onConfirm={handleDeactivate}
          onCancel={() => setConfirmingDeactivate(false)}
        />
      )}
    </div>
  );
}
