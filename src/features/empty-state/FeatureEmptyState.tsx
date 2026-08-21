export function FeatureEmptyState({ kind }: { kind: 'diary' | 'progress' }) {
  const diary = kind === 'diary';
  return <div className="feature-empty-page page-container"><span className="page-eyebrow">{diary ? 'Diário alimentar' : 'Progresso corporal'}</span><h1>{diary ? 'As refeições vêm na próxima etapa.' : 'Seu histórico começa com você.'}</h1><p>{diary ? 'A estrutura já isola cada perfil e alimentará o dashboard com consumo real. O cadastro completo de alimentos e refeições será implementado sem botões falsos.' : 'Pesagens e medidas já possuem modelo por perfil. A experiência completa de registro fica reservada para a etapa dedicada.'}</p><div className="empty-feature-mark" aria-hidden="true">{diary ? '≡' : '↗'}</div></div>;
}
