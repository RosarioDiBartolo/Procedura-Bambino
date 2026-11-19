import TextType from '../components/ui/TextType';
import { useState, type ReactNode } from 'react';
import { ArrowRight } from '@nls/ui/icons8';
import { decisionCases, selectCase, steps, type StepId } from '../flow';
import { useWorkflow } from '../useWorkflow';
import { Illustration } from '../Illustration';
import { UserPhoto } from '../UserPhotos';
import respiratorySupport from '../assets/clinical/respiratory-support-unsplash.jpg';
import medication from '../assets/clinical/medication-unsplash.jpg';
import simulation from '../assets/clinical/simulation.jpg';
export function DecisionContent({step, effective = false, children}: {step: StepId; effective?: boolean; children?: ReactNode}) {
  const { change } = useWorkflow();
  const [error, setError] = useState('');
  function choose(choice: 'yes' | 'no') {
    try {
      const confirmedEffective = effective || (step === 'hr60' && choice === 'yes');
      const next = selectCase(step, choice, confirmedEffective);
      const item = decisionCases[step]!.find(c => c.id === choice)!;
      change(next, `Caso selezionato: ${item.label} → ${steps[next].title}`, {
        selectedCase: choice, ...(step === 'hr60' && choice === 'yes' ? { effective: confirmedEffective } : {}),
      });
    } catch (e) { setError((e as Error).message); }
  }
  return <div className="gap-2.5 min-h-0 grow shrink basis-[0%] flex flex-col">
    <p className="compact-decision-instruction m-0 text-[length:12px] leading-[1.5] text-[#6a8292]"><TextType text="Seleziona la situazione osservata dal team. Non occorre trascrivere i valori." /></p>
    {children}
    <div className="decision-options">
      {decisionCases[step]?.map(c => <button type="button" className={`case-card decision-card ${c.id === 'no' ? 'case-no' : ''}`} key={c.id} onClick={() => choose(c.id)} aria-label={`${c.label}. ${c.destination}`}>
        <div className="case-art decision-photo">
          {step === 'distress' && c.id === 'yes' ? <img src={respiratorySupport} alt="Neonato in incubatrice con supporto di ossigeno e monitoraggio" className="object-[80%_50%]" />
          : step === 'advanced-hr' && c.id === 'yes' ? <img src={medication} alt="Preparazione di farmaci da un flaconcino" />
          : ['respiration', 'hr100', 'hr60'].includes(step) && c.id === 'yes' ? <img src={simulation} alt="Simulazione di assistenza neonatale su manichino" />
          : <UserPhoto name={step === 'initial' ? (c.id === 'yes' ? 'newborn' : 'birthCare') : c.art === 'skin' ? 'skin' : 'newborn'} />}
          <span className="decision-case-label">{c.id === 'yes' ? 'Caso 1' : 'Caso 2'}</span>
        </div>
        <div className="decision-title"><span className="decision-icon" aria-hidden="true"><Illustration name={c.art} /></span><strong><TextType text={c.label} /></strong></div>
        <p className="decision-detail"><TextType text={c.detail} /></p>
        <div className="decision-conditions">{c.conditions && <ul className="case-conditions">{c.conditions.map(condition => <li key={condition}><span aria-hidden="true">•</span><TextType text={condition} /></li>)}</ul>}</div>
        <div className="decision-destination"><TextType text={c.destination} /><ArrowRight size={20} /></div>
      </button>)}
    </div>
    {error && <p className="text-[#a34742]" role="alert">{error}</p>}
  </div>;
}
