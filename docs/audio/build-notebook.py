import json,re,ast
from pathlib import Path
root=Path('docs/audio')
data=json.loads((root/'flow-snapshot.json').read_text(encoding='utf-8'))
prompts={
'birth':'Inserisci i minuti trascorsi dalla nascita, poi premi Registra nascita e prosegui.',
'initial':'Indica separatamente: gravidanza a termine, buon tono, respira o piange. Poi conferma la valutazione.',
'respiration':'Inserisci la frequenza cardiaca rilevata in battiti al minuto e indica se sono presenti apnea o gasping. Poi conferma la valutazione.',
'distress':'Indica se sono presenti respiro difficoltoso o cianosi persistente. Poi conferma la valutazione.',
'hr100':'Inserisci la frequenza cardiaca rilevata in battiti al minuto, poi conferma la valutazione.',
'hr60':'Inserisci la frequenza cardiaca rilevata in battiti al minuto. Prima delle compressioni, conferma con il team la ventilazione efficace. Poi conferma la valutazione.',
'advanced-hr':'Inserisci la frequenza cardiaca rilevata in battiti al minuto, poi conferma la valutazione.'}
def spoken(t):
 for a,b in [('SpO₂','saturazione periferica di ossigeno'),('O₂','ossigeno'),('FC','frequenza cardiaca'),('PPV','ventilazione a pressione positiva'),('ECG','elettrocardiogramma'),('CVO','catetere venoso ombelicale'),('CPAP','pressione positiva continua nelle vie aeree'),('DOPPES','Doppes'),(' · ','. '),('e/o','o'),('apnea/gasping','apnea o gasping')]: t=t.replace(a,b)
 t=re.sub(r'\bIO\b','accesso intraosseo',t)
 t=re.sub(r'<\s*(\d+)\s*/min',r'inferiore a \1 battiti al minuto',t)
 t=re.sub(r'(\d+)/min',r'\1 battiti al minuto',t)
 t=t.replace('3–5 min','3 a 5 minuti').replace('100%','100 per cento')
 t=re.sub(r'\.\s*\.', '.', t)
 return t.strip()
clips=[]
for key,s in data['steps'].items():
 parts=[s['title'],s['subtitle']]
 if s.get('actions'): parts.append('Interventi: '+'. '.join(s['actions']))
 if key=='cord': parts.append('Clampaggio e milking: attendere almeno 60 secondi prima di clampare; considerare milking nei neonati depressi tra 35 e 42 settimane. Non ritardare gli interventi necessari: concorda la gestione con il team.')
 parts.append(prompts.get(key,'Al termine, premi Prosegui.' if s.get('next') else ''))
 clips.append(dict(id=key,category='step',title=s['title'],text=spoken('. '.join(p for p in parts if p)),source=s['source']))
extra={
'saturation':('Target di saturazione preduttale','Target di saturazione preduttale. A 2 minuti: dal 65 al 70 per cento. A 3 minuti: dal 70 al 75 per cento. A 4 minuti: dal 75 all’80 per cento. A 5 minuti: dall’80 all’85 per cento. A 10 minuti: dall’85 al 95 per cento.'),
'mrsopa':('Correttivi MR SOPA','Correttivi della ventilazione in maschera. '+'. '.join(x[1] for x in data['mrsopa'])+'.'),
'doppes':('Verifiche DOPPES','Cause di ventilazione inefficace nel neonato intubato. '+'. '.join(x[1] for x in data['doppes'])+'.'),
'newborn':('Dati dichiarati nello scenario','Inserisci, se disponibili, l’età gestazionale in settimane compiute e la temperatura rilevata in gradi Celsius. Poi premi Registra dati dello scenario.'),
'help':('Aiuto e coordinamento del team','Attiva il sistema di chiamata previsto dalla struttura e condividi il passaggio attuale. Nessuna chiamata viene effettuata dall’app. Conferma sullo schermo la richiesta effettuata nello scenario.'),
'finished':('Simulazione conclusa','Simulazione conclusa. Puoi esportare il registro o avviare un’altra sessione. Il registro corrente viene perso chiudendo o ricaricando la pagina.')}
for key,(title,text) in extra.items(): clips.append(dict(id=key,category='reference' if key in ['saturation','mrsopa','doppes'] else 'interface',title=title,text=spoken(text),source='Contenuti del Nido'))
(root/'scripts-it.json').write_text(json.dumps(clips,ensure_ascii=False,indent=2),encoding='utf-8')
install='''%pip install -q "kokoro>=0.9.2,<1" soundfile
!apt-get -qq -y install espeak-ng > /dev/null 2>&1
'''
config='''from pathlib import Path
import hashlib, json, shutil, re, importlib.metadata
import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline
from IPython.display import Audio, display

# Voce italiana: if_sara (femminile) oppure im_nicola (maschile).
VOICE = "if_sara"
SPEED = 0.95
SAMPLE_RATE = 24000
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
OUTPUT = Path("/content/nls-audio") / VOICE
OUTPUT.mkdir(parents=True, exist_ok=True)
print(f"Voce: {VOICE} | dispositivo: {DEVICE}")
pipeline = KPipeline(lang_code="i", repo_id="hexgrad/Kokoro-82M", device=DEVICE)
'''
texts='AUDIO_SCRIPTS = '+repr(clips)+'\nprint(f"{len(AUDIO_SCRIPTS)} audio: 18 passaggi, 3 supporti, 3 messaggi di interfaccia.")\n'
generate='''# Genera un WAV per passaggio. I segmenti restituiti da Kokoro vengono uniti.
# Rilanciare questa cella riprende i file completati, se testo e impostazioni coincidono.
manifest = {"voice": VOICE, "speed": SPEED, "sample_rate": SAMPLE_RATE,
            "model": "hexgrad/Kokoro-82M", "kokoro_version": importlib.metadata.version("kokoro"),
            "purpose": "Prototipo per simulazione; audio da ascoltare e verificare", "clips": []}
failures = []
for index, clip in enumerate(AUDIO_SCRIPTS, 1):
    path = OUTPUT / f"{clip['id']}.wav"
    text_path = OUTPUT / f"{clip['id']}.txt"
    stamp = OUTPUT / f"{clip['id']}.sha256"
    fingerprint = hashlib.sha256(json.dumps({"text": clip["text"], "voice": VOICE,
        "speed": SPEED, "model": manifest["model"], "version": manifest["kokoro_version"]},
        sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    try:
        cached = path.exists() and stamp.exists() and stamp.read_text() == fingerprint
        if cached:
            audio, sr = sf.read(path, dtype="float32")
            if sr != SAMPLE_RATE or not audio.size or not np.isfinite(audio).all():
                raise ValueError("File esistente non valido: elimina il WAV e riprova.")
        else:
            chunks = []
            for _, _, segment in pipeline(clip["text"], voice=VOICE, speed=SPEED, split_pattern=r"\\n+"):
                if segment is None:
                    continue
                if hasattr(segment, "detach"):
                    segment = segment.detach().cpu().numpy()
                segment = np.asarray(segment, dtype=np.float32).reshape(-1)
                if segment.size:
                    chunks.append(segment)
            if not chunks:
                raise ValueError("Il modello non ha prodotto audio.")
            audio = np.concatenate(chunks)
            if not np.isfinite(audio).all():
                raise ValueError("Campioni audio non validi.")
            sf.write(path, audio, SAMPLE_RATE, subtype="PCM_16")
            stamp.write_text(fingerprint)
        text_path.write_text(clip["text"], encoding="utf-8")
        manifest["clips"].append({**clip, "file": path.name,
            "duration_seconds": round(len(audio) / SAMPLE_RATE, 2), "sha256_text_settings": fingerprint})
        print(f"[{index}/{len(AUDIO_SCRIPTS)}] {path.name}: {len(audio)/SAMPLE_RATE:.1f} s" + (" (già pronto)" if cached else ""))
    except Exception as exc:
        failures.append({"id": clip["id"], "error": str(exc)})
        print(f"ERRORE {clip['id']}: {exc}")

(OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
(OUTPUT / "errors.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")
if failures:
    raise RuntimeError(f"{len(failures)} audio non generati. Correggi gli errori e rilancia questa cella. ZIP non creato.")
assert len(manifest["clips"]) == len(AUDIO_SCRIPTS)
archive = shutil.make_archive(str(OUTPUT.parent / f"nls-audio-{VOICE}"), "zip", root_dir=OUTPUT)
print(f"\\nCompletati {len(manifest['clips'])} audio. Durata totale: {sum(c['duration_seconds'] for c in manifest['clips'])/60:.1f} minuti")
# Anteprima di una richiesta di parametri; gli altri file sono nello ZIP.
display(Audio(filename=str(OUTPUT / "respiration.wav")))
from google.colab import files
files.download(archive)
'''
cells=[]
def cell(kind,text): cells.append({'cell_type':kind,'metadata':{},'source':text.splitlines(keepends=True),**({'outputs':[],'execution_count':None} if kind=='code' else {})})
cell('markdown','# Audio italiani per il prototipo NLS\nEsegui le celle in ordine in Google Colab. Non aggiungere barre inverse alla fine delle righe. Il notebook genera 24 WAV e uno ZIP, senza servizi vocali a pagamento. Il primo avvio scarica modello e voci. Una GPU Colab è facoltativa.\n\nI testi sono una fotografia del prototipo corrente: ascolta e verifica pronunce, numeri e corrispondenza alle procedure prima di integrarli. La generazione non modifica l’app. I file rimangono nella sessione Colab: scarica lo ZIP prima di chiuderla.\n')
for s in [install,config,texts,generate]: cell('code',s)
nb={'nbformat':4,'nbformat_minor':5,'metadata':{'colab':{'name':'Genera audio NLS italiano.ipynb'},'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'}},'cells':cells}
(root/'Genera-audio-NLS-italiano.ipynb').write_text(json.dumps(nb,ensure_ascii=False,indent=2),encoding='utf-8')
# Validate notebook code without executing installs or model downloads.
for c in cells:
 if c['cell_type']=='code' and c['source']!=install.splitlines(keepends=True): ast.parse(''.join(c['source']))
assert len(clips)==24 and len({c['id'] for c in clips})==24
assert {s['id'] for s in clips if s['category']=='step'}==set(data['steps'])
assert all('&#x20;' not in c['text'] for c in clips)
print('Notebook validato: 24 audio, tutti i 18 passaggi coperti, codice Python verificato.')
