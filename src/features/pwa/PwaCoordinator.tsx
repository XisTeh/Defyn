import { useRef } from 'react';
import type { ReturnTypeOfDeviceExperience } from './types';
import { useAccessibleDialog } from '../../shared/hooks/use-accessible-dialog';
import './pwa-coordinator.css';

export function PwaCoordinator({ experience }: { experience: ReturnTypeOfDeviceExperience }) {
  return <>
    {experience.iosHelpOpen && <IosInstallHelp onClose={() => experience.setIosHelpOpen(false)} />}
  </>;
}

function IosInstallHelp({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useAccessibleDialog(dialogRef, onClose, closeRef);
  return <div className="pwa-help-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="pwa-help" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title">
      <header><div><span className="page-eyebrow">Instalação no iPhone/iPad</span><h2 id="pwa-ios-title">Leve o DEFYN para a tela inicial</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar">×</button></header>
      <ol><li>Abra o menu <strong>Compartilhar</strong> do Safari.</li><li>Toque em <strong>Adicionar à Tela de Início</strong>.</li><li>Confirme em <strong>Adicionar</strong>.</li></ol>
      <p>Depois de instalado, o DEFYN abre como aplicativo e mantém seus dados neste dispositivo.</p>
    </section>
  </div>;
}
