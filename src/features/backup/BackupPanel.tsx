import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BackupService, BackupValidationError } from '../../application/backup/backup-service';
import type { DefynBackup } from '../../domain/export/export-format';
import { toLocalDateKey } from '../../domain/shared/local-date';
import { repositories } from '../../infrastructure/repositories';
import { browserCapabilities, formatBytes, readStorageSnapshot, type StorageSnapshot } from '../../platform/device-capabilities';
import { Button } from '../../shared/components/Button';
import './backup-panel.css';

const backupService = new BackupService(repositories.backup);

export function BackupPanel({ onRestored }: { onRestored: () => Promise<void> }) {
  const capabilities = useMemo(() => browserCapabilities(), []);
  const [candidate, setCandidate] = useState<DefynBackup>();
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [storage, setStorage] = useState<StorageSnapshot>({ level: 'unknown' });
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
    anchor.click();
    URL.revokeObjectURL(url);
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
      setStatus('Backup restaurado com integridade.');
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

  return <div className="backup-page page-container">
    <header className="section-page-header"><div><span className="page-eyebrow">Backup local</span><h1>Seus dados, sob seu controle.</h1><p>Exporte um JSON v4 validado, com imagens otimizadas, ou restaure uma cópia completa neste dispositivo.</p></div></header>
    <div className="backup-grid">
      <article className="backup-card export-card"><span className="backup-symbol">↓</span><div><span className="page-eyebrow">Exportar</span><h2>Criar uma cópia completa</h2><p>Inclui perfis, metas, alimentos, diário, água, receitas, treinos, progresso e mídia necessária. O JSON é revalidado antes de sair.</p></div><div className="backup-export-actions"><Button variant="secondary" compact type="button" onClick={() => void exportBackup(false)}>Baixar arquivo</Button>{capabilities.fileShare && <Button variant="secondary" compact type="button" onClick={() => void exportBackup(true)}>Compartilhar</Button>}</div></article>
      <article className="backup-card restore-card"><span className="backup-symbol">↑</span><div><span className="page-eyebrow">Restaurar</span><h2>Substituir pelos dados de um backup</h2><p>O arquivo é validado antes de qualquer alteração. A restauração completa é transacional.</p></div><input ref={inputRef} id="backup-file" type="file" accept="application/json,.json" onChange={(event) => void selectFile(event)} /><label htmlFor="backup-file">{fileName || 'Selecionar arquivo JSON'}</label>{candidate && <div className="restore-confirm"><strong>Confirme a substituição completa</strong><p>Todos os dados atuais deste dispositivo serão substituídos pelo conteúdo validado.</p><button type="button" disabled={restoring} onClick={() => void restore()}>{restoring ? 'Restaurando…' : 'Restaurar este backup'}</button></div>}</article>
    </div>
    {status && <p className="backup-status" role="status">{status}</p>}{error && <p className="backup-error" role="alert">{error}</p>}
    <aside className={`storage-card ${storage.level}`}><div><span className="page-eyebrow">Armazenamento local</span><strong>{storage.usage === undefined ? 'Estimativa indisponível' : `${formatBytes(storage.usage)} usados de ${formatBytes(storage.quota)}`}</strong><p>{storage.level === 'critical' ? 'Espaço quase esgotado. Exporte um backup antes de remover fotos ou dados do navegador.' : storage.level === 'attention' ? 'O uso está alto. Mantenha um backup recente.' : storage.persisted ? 'O navegador marcou estes dados como persistentes.' : 'O navegador ainda pode remover dados sob pressão de espaço. Backup continua essencial.'}</p></div>{capabilities.persistentStorage && !storage.persisted && <button type="button" onClick={() => void requestPersistence()}>Solicitar proteção local</button>}</aside>
    <aside className="backup-note"><strong>Privado por padrão</strong><p>O DEFYN não envia este arquivo para nenhum servidor. Você escolhe onde armazená-lo.</p></aside>
  </div>;
}
