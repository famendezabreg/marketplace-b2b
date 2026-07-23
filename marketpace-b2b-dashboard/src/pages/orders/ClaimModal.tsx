import { useRef, useState } from 'react';
import { ImageOff, Loader2, Upload, X } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import { uploadFile } from '../../lib/uploads';
import { Modal, ErrorBanner } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Field, Textarea } from '../../components/ui/Form';

interface EvidenceItem {
  key: string;
  previewUrl: string;
  uploading: boolean;
  uploadedUrl?: string;
  error?: string;
}

export function ClaimModal({
  orderId,
  onClose,
  onSent,
}: {
  orderId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const newItems: EvidenceItem[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));
    setEvidence((prev) => [...prev, ...newItems]);

    await Promise.all(
      newItems.map(async (item, i) => {
        const file = files[i];
        try {
          const url = await uploadFile(file);
          setEvidence((prev) =>
            prev.map((e) => (e.key === item.key ? { ...e, uploading: false, uploadedUrl: url } : e)),
          );
        } catch (err) {
          setEvidence((prev) =>
            prev.map((e) =>
              e.key === item.key ? { ...e, uploading: false, error: extractErrorMessage(err) } : e,
            ),
          );
        }
      }),
    );
  }

  function removeEvidence(key: string) {
    setEvidence((prev) => prev.filter((e) => e.key !== key));
  }

  const uploadedUrls = evidence.filter((e) => e.uploadedUrl).map((e) => e.uploadedUrl!);
  const isUploading = evidence.some((e) => e.uploading);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 10) {
      setError('Describe el problema con al menos 10 caracteres.');
      return;
    }
    if (isUploading) {
      setError('Espera a que terminen de subirse las fotos.');
      return;
    }
    if (uploadedUrls.length === 0) {
      setError('Adjunta al menos una foto como evidencia.');
      return;
    }

    setSending(true);
    try {
      await api.post('/claims', { orderId, reason, evidenceUrls: uploadedUrls });
      onSent();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Reportar problema con este pedido" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ink-500">
          Cuéntanos qué llegó mal (producto dañado, incompleto, distinto a lo pedido) y adjunta
          fotos desde tu dispositivo como evidencia. El proveedor o el admin lo revisarán y te
          contactarán con una resolución: reembolso, o llevarlo al proveedor para un cambio.
        </p>

        <Field label="Qué salió mal" htmlFor="claim-reason">
          <Textarea
            id="claim-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: llegaron 3 unidades con la caja aplastada y el contenido roto..."
          />
        </Field>

        <div>
          <p className="font-manifest mb-2 text-xs text-ink-500">Fotos de evidencia</p>

          {evidence.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {evidence.map((item) => (
                <div
                  key={item.key}
                  className="relative h-20 w-20 overflow-hidden rounded-sm border border-paper-300"
                >
                  <img src={item.previewUrl} alt="Evidencia" className="h-full w-full object-cover" />
                  {item.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-950/50">
                      <Loader2 className="h-5 w-5 animate-spin text-paper-50" />
                    </div>
                  )}
                  {item.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-alert-600/80 p-1">
                      <ImageOff className="h-5 w-5 text-paper-50" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEvidence(item.key)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-ink-950/70 p-0.5 text-paper-50 hover:bg-ink-950"
                    aria-label="Quitar foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-sm border border-dashed border-paper-300 px-3 py-2 text-sm text-ink-500 hover:border-dock-500 hover:text-dock-600"
          >
            <Upload className="h-4 w-4" /> Subir fotos desde tu dispositivo
          </button>
          <p className="mt-1 text-xs text-ink-400">JPG, PNG, WEBP o GIF, maximo 5MB cada una.</p>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={sending} disabled={isUploading}>
            Enviar reclamo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
