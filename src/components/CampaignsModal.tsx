import { useRef } from 'react';
import { X, Download, Upload, Trash2, Check, Plus } from 'lucide-react';
import type { Campaign } from '../types/rpg';

interface CampaignsModalProps {
  open: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  activeCampaignId: string;
  onSelectCampaign: (id: string) => void;
  onDeleteCampaign: (id: string) => void;
  onOpenNewCampaign: () => void;
  onImportCampaign: (campaign: Campaign) => void;
}

export function CampaignsModal({
  open,
  onClose,
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  onDeleteCampaign,
  onOpenNewCampaign,
  onImportCampaign,
}: CampaignsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleExportJson = (campaign: Campaign) => {
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Campaign;
      if (parsed && parsed.title && Array.isArray(parsed.notes) && Array.isArray(parsed.messages)) {
        onImportCampaign({
          ...parsed,
          id: `campaign-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Ignore invalid JSON file
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaigns-modal-title"
    >
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-xl border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#17191E] text-zinc-900 dark:text-zinc-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-[#262932]">
          <div>
            <h2 id="campaigns-modal-title" className="font-display text-lg font-semibold">
              Suas Campanhas
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Salvas localmente neste navegador · exporte backups em JSON quando quiser
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D]"
            aria-label="Fechar campanhas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {campaigns.map((camp) => {
            const isActive = camp.id === activeCampaignId;
            return (
              <div
                key={camp.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 transition-colors ${
                  isActive
                    ? 'border-amber-500/50 bg-amber-500/8'
                    : 'border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {camp.title}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        <Check className="w-3 h-3" />
                        Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {camp.subtitle} · {camp.messages.length} msgs · {camp.notes.length} abas de notas
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCampaign(camp.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
                    >
                      Abrir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportJson(camp)}
                    title="Exportar backup JSON"
                    className="p-2 rounded-md border border-zinc-200 dark:border-[#2E323D] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#252932]"
                    aria-label="Exportar backup JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {campaigns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteCampaign(camp.id)}
                      title="Excluir campanha"
                      className="p-2 rounded-md border border-zinc-200 dark:border-[#2E323D] text-zinc-500 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-[#252932]"
                      aria-label="Excluir campanha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-[#262932] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-[#2E323D] text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#22252D]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewCampaign();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Campanha</span>
          </button>
        </div>
      </div>
    </div>
  );
}
