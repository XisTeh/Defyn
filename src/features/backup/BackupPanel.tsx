import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BackupService, BackupValidationError, canClearLocalData } from '../../application/backup/backup-service';
import type { DefynBackup } from '../../domain/export/export-format';
import { toLocalDateKey } from '../../domain/shared/local-date';
import { repositories } from '../../infrastructure/repositories';
import { browserCapabilities, formatBytes, readStorageSnapshot, type StorageSnapshot } from '../../platform/device-capabilities';
import { Button } from '../../shared/components/Button';
import { APP_VERSION } from '../../app/version';
import { useAccessibleDialog } from '../../shared/hooks/use-accessible-dialog';
import { useSyncStatus } from '../sync/sync-status-context';
import './backup-panel.css';

const backupService = new BackupService(repositories.backup);

export function BackupPanel({ onRestored, onReset }: { onRestored: () => Promise<void>; onReset: () => Promise<void> }) {
  const capabilities = useMemo(() => browserCapabilities(), []);
  const [candidate, setCandidate] = useState<DefynBackup>();
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [storage, setStorage] = useState<StorageSnapshot>({ level: 'unknown' });
  const sync = useSyncStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void readStorageSnapshot().then(setStorage); }, []);

  async function exportBackup(preferShare = false) {
    const backup = await backupService.export();
    const serialized = JSON.stringify(backup, null, 2);
    backupService.parse(serialized);
    const fileName = `defyn-backup-${toLocalDateKey(new Date())}.json`;
    const file = new File([serialized], fileName, { type: 'application/json' });
    if (preferShare && capabilities.fileShare && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup DEFYN', text: 'Cópia local completa e validada dos dados do DEFYN.' });
      setStatus('Backup validado e compartilhado pelo sistema do dispositivo.');
      return;
    }
    const blob = file;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus('Backup exportado. Guarde o arquivo em um local seguro.');
  }

  async function requestPersistence() {
    if (!navigator.storage?.persist) return;
    const persisted = await navigator.storage.persist();
    setStorage(await readStorageSnapshot());
    setStatus(persisted ? 'O navegador marcou os dados do DEFYN como persistentes.' : 'O navegador não concedeu persistência. Mantenha backups atualizados.');
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setError('');
    setStatus('');
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = backupService.parse(await file.text());
      setCandidate(backup);
      setFileName(file.name);
      setStatus(`Backup válido: ${backup.data.profiles.length} perfil(is), exportado em ${new Date(backup.exportedAt).toLocaleString('pt-BR')}.`);
    } catch (caught) {
      setCandidate(undefined);
      setFileName(file.name);
      setError(caught instanceof BackupValidationError ? caught.message : 'Não foi possível ler o arquivo.');
    }
  }

  async function restore() {
    if (!candidate) return;
    setRestoring(true);
    setError('');
    try {
      await backupService.restore(candidate);
      setStatus('Backup restaurado localmente. Ao continuar, o DEFYN oferecerá sincronização por merge; a nuvem não foi sobrescrita.');
      setCandidate(undefined);
      setFileName('');
      if (inputRef.current) inputRef.current.value = '';
      await onRestored();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'A restauração falhou e os dados atuais foram preservados.');
    } finally {
      setRestoring(false);
    }
  }

  async function resetLocalData() {
    setResetting(true);
    setError('');
    try {
      await backupService.reset();
      await sync.afterLocalClear();
      await onReset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível apagar os dados locais.');
      setResetting(false);
    }
  }

  return <div className="backup-page page-container" data-pwa-update-blocking={candidate || restoring || resetOpen || resetting ? 'true' : undefined}>
    <header className="section-page-header"><div><span className="page-eyebrow">Backup local</span><h1>Seus dados, sob seu controle.</h1><p>Exporte um JSON v7 validado, com imagens otimizadas, ou restaure uma cópia completa neste dispositivo.</p></div></header>
    <div className="backup-grid">
      <article className="backup-card export-card"><span className="backup-symbol">↓</span><div><span className="page-eyebrow">Exportar</span><h2>Criar uma cópia completa</h2><p>Inclui perfis, metas, resumo diário, água, rotina, sono, treinos, progresso e mídia local. O JSON é revalidado antes de sair.</p></div><div className="backup-export-actions"><Button variant="secondary" compact type="button" onClick={() => void exportBackup(false)}>Baixar arquivo</Button>{capabilities.fileShare && <Button variant="secondary" compact type="button" onClick={() => void exportBackup(true)}>Compartilhar</Button>}</div></article>
      <article className="backup-card restore-card"><span className="backup-symbol">↑</span><div><span className="page-eyebrow">Restaurar</span><h2>Substituir pelos dados de um backup</h2><p>O arquivo é validado antes de qualquer alteração. A restauração completa é transacional.</p></div><input ref={inputRef} id="backup-file" type="file" accept="application/json,.json" onChange={(event) => void selectFile(event)} /><label htmlFor="backup-file">{fileName || 'Selecionar arquivo JSON'}</label>{candidate && <div className="restore-confirm"><strong>Confirme a substituição completa</strong><p>Todos os dados atuais deste dispositivo serão substituídos pelo conteúdo validado.</p><Button type="button" variant="danger" compact loading={restoring} onClick={() => void restore()}>Restaurar este backup</Button></div>}</article>
    </div>
    <section className="local-reset-card" aria-labelledby="local-reset-title"><div><span className="page-eyebrow">Dados deste dispositivo</span><h2 id="local-reset-title">Limpar dados deste dispositivo</h2><p>Não apaga a nuvem. Dados já sincronizados permanecem na conta e podem ser baixados novamente após entrar.</p></div><Button variant="danger" compact type="button" onClick={() => setResetOpen(true)}>Limpar dados deste dispositivo</Button></section>
    {status && <p className="backup-status" role="status">{status}</p>}{error && <p className="backup-error" role="alert">{error}</p>}
    <aside className={`storage-card ${storage.level}`}><div><span className="page-eyebrow">Armazenamento local</span><strong>{storage.usage === undefined ? 'Estimativa indisponível' : `${formatBytes(storage.usage)} usados de ${formatBytes(storage.quota)}`}</strong><p>{storage.level === 'critical' ? 'Espaço quase esgotado. Exporte um backup antes de remover fotos ou dados do navegador.' : storage.level === 'attention' ? 'O uso está alto. Mantenha um backup recente.' : storage.persisted ? 'O navegador marcou estes dados como persistentes.' : 'O navegador ainda pode remover dados sob pressão de espaço. Backup continua essencial.'}</p></div>{capabilities.persistentStorage && !storage.persisted && <button type="button" onClick={() => void requestPersistence()}>Solicitar proteção local</button>}</aside>
    <aside className="backup-note"><strong>Privado por padrão</strong><p>O DEFYN não envia este arquivo para nenhum servidor. Você escolhe onde armazená-lo. App v{APP_VERSION} · backup v7.</p></aside>
    {resetOpen && <ResetDialog busy={resetting} pending={sync.pendingCount} onClose={() => { if (!resetting) setResetOpen(false); }} onExport={() => void exportBackup(false)} onReset={() => void resetLocalData()} />}
  </div>;
}

function ResetDialog({ busy, pending, onClose, onExport, onReset }: { busy: boolean; pending: number; onClose: () => void; onExport: () => void; onReset: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [confirmation, setConfirmation] = useState('');
  useAccessibleDialog(dialogRef, onClose, closeRef);
  const confirmed = confirmation === 'RESETAR' && canClearLocalData(pending);
  return <div className="local-reset-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section ref={dialogRef} className="local-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="local-reset-dialog-title" aria-describedby="local-reset-dialog-description"><header><div><span className="page-eyebrow">Ação irreversível neste dispositivo</span><h2 id="local-reset-dialog-title">Limpar dados deste dispositivo</h2></div><button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Fechar">×</button></header><p id="local-reset-dialog-description">Perfis, metas, água, resumo diário, rotina, sono, treinos, progresso, fotos, mídia, preferências por perfil e dados legados deste navegador serão apagados localmente. A conta e os dados sincronizados na nuvem não serão apagados. Ao concluir, você sairá da conta neste dispositivo.</p>{pending > 0 && <p className="local-reset-warning"><strong>Ação bloqueada:</strong> há {pending} alteração(ões) que ainda existem apenas neste dispositivo. Sincronize-as antes de limpar.</p>}<p className="local-reset-warning">Se quiser guardar uma cópia, exporte um backup antes de continuar.</p><label>Digite <strong>RESETAR</strong> para habilitar a ação<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-describedby="local-reset-dialog-description" disabled={busy||pending>0}/></label><footer><Button variant="secondary" type="button" onClick={onExport} disabled={busy}>Exportar backup</Button><Button variant="danger" type="button" loading={busy} disabled={!confirmed} onClick={onReset}>Limpar este dispositivo</Button></footer></section></div>;
}
