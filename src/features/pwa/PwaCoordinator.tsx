import type { ReturnTypeOfDeviceExperience } from './types';
import './pwa-coordinator.css';

export function PwaCoordinator({ experience }: { experience: ReturnTypeOfDeviceExperience }) {
  return <>
    {experience.updateAvailable && <aside className="pwa-update-banner" role="status">
      <div><strong>{experience.updateDeferred ? 'Atualização guardada' : 'Nova versão disponível'}</strong><span>{experience.updateDeferred ? 'Seu treino está em andamento. Atualize depois de finalizar para não interromper a sessão.' : 'Os dados locais permanecem no dispositivo.'}</span></div>
      {!experience.updateDeferred && <button type="button" onClick={() => void experience.applyUpdate()}>Atualizar agora</button>}
    </aside>}
    {experience.iosHelpOpen && <div className="pwa-help-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) experience.setIosHelpOpen(false); }}>
      <section className="pwa-help" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title">
        <header><div><span className="page-eyebrow">Instalação no iPhone/iPad</span><h2 id="pwa-ios-title">Leve o DEFYN para a tela inicial</h2></div><button type="button" onClick={() => experience.setIosHelpOpen(false)} aria-label="Fechar">×</button></header>
        <ol><li>Abra o menu <strong>Compartilhar</strong> do Safari.</li><li>Toque em <strong>Adicionar à Tela de Início</strong>.</li><li>Confirme em <strong>Adicionar</strong>.</li></ol>
        <p>Depois de instalado, o DEFYN abre como aplicativo e mantém seus dados neste dispositivo.</p>
      </section>
    </div>}
  </>;
}
