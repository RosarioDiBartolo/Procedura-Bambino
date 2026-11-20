"""Build the self-contained Qwen Colab notebook from the reviewed Italian scripts."""
import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
clips = json.loads((ROOT / 'scripts-it.json').read_text(encoding='utf-8'))
cells = []
def md(text):
    cells.append({'cell_type':'markdown','metadata':{},'source':text.splitlines(keepends=True)})
def code(text):
    ast.parse('\n'.join(line for line in text.splitlines() if not line.startswith(('%','!'))))
    cells.append({'cell_type':'code','metadata':{},'source':text.splitlines(keepends=True),'execution_count':None,'outputs':[]})

md('''# Qwen3-TTS · Audio italiani del prototipo NLS
Notebook autonomo: contiene i testi dei **23 audio** (18 passaggi, 3 supporti, 2 messaggi).

1. In Colab scegli **Runtime → Cambia tipo di runtime → GPU**. Una T4 è il punto di partenza; disponibilità e limiti dipendono da Colab.
2. Esegui installazione e configurazione, poi genera e ascolta i due campioni.
3. Scegli il campione nella cella «Selezione» e genera tutti gli audio.
4. Scarica lo ZIP prima che la sessione Colab termini.

Usa **float16 su T4** e SDPA, senza FlashAttention 2. VoiceDesign e Base vengono caricati uno alla volta. Se Base 1.7B esaurisce la memoria, seleziona Base 0.6B e riesegui dal caricamento Base. La compatibilità effettiva dipende dalle librerie e dalla GPU assegnata; questo notebook non è stato eseguito su Colab dall’autore.

Il modello legge testi predefiniti; non sceglie interventi. Ascolta e verifica testi, numeri e pronunce prima dell’integrazione. I WAV non vengono collegati automaticamente all’app.

Fonti: [Qwen3-TTS ufficiale](https://github.com/QwenLM/Qwen3-TTS), [modelli Qwen](https://huggingface.co/collections/Qwen/qwen3-tts). Pesi e codice Qwen: Apache 2.0. Nessuna chiave API richiesta; il primo avvio scarica alcuni GB di modelli.
''')
md('## 1 · Installazione\nUsa una sessione Colab nuova. Se Colab chiede un riavvio dopo l’installazione, riavvia e prosegui dalla configurazione.\n')
code('''%pip install -q "qwen-tts==0.1.1" soundfile
!apt-get -qq update > /dev/null 2>&1
!apt-get -qq -y install sox libsox-fmt-all > /dev/null 2>&1
''')
md('## 2 · Configurazione\nLa descrizione della voce si può modificare. I due campioni differiscono per il seme di generazione.\n')
code('''from pathlib import Path
import gc, hashlib, importlib.metadata, json, re, shutil, zipfile
import numpy as np
import soundfile as sf
import torch
from IPython.display import Audio, display
from qwen_tts import Qwen3TTSModel

assert torch.cuda.is_available(), "Attiva una GPU da Runtime → Cambia tipo di runtime."
props = torch.cuda.get_device_properties(0)
print(f"GPU: {props.name} | memoria: {props.total_memory / 2**30:.1f} GiB")
DTYPE = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
ATTENTION = "sdpa"
DESIGN_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
BASE_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"  # alternativa: Qwen/Qwen3-TTS-12Hz-0.6B-Base
VOICE_DESCRIPTION = (
    "An adult female voice speaking native standard Italian, clear and natural, "
    "calm and professional. Moderate, unhurried pace with short pauses between sentences. "
    "Precise articulation of numbers and medical terminology. Neutral delivery, no theatrical emotion, "
    "no whispering. Clean studio recording without background sounds."
)
REFERENCE_TEXT = (
    "Valuta il respiro e rileva la frequenza cardiaca. "
    "Inserisci il valore in battiti al minuto, poi conferma la valutazione. "
    "Comunica al team gli interventi e la risposta del neonato."
)
CANDIDATE_SEEDS = [42, 123]
WORK = Path("/content/nls-qwen")
WORK.mkdir(parents=True, exist_ok=True)

def release_models():
    for name in ("design_model", "clone_model", "voice_prompt"):
        globals().pop(name, None)
    gc.collect()
    torch.cuda.empty_cache()

def load_model(model_id):
    return Qwen3TTSModel.from_pretrained(
        model_id, device_map="cuda:0", dtype=DTYPE, attn_implementation=ATTENTION)

def checked_audio(wave):
    wave = np.asarray(wave, dtype=np.float32).reshape(-1)
    if not wave.size or not np.isfinite(wave).all() or np.max(np.abs(wave)) < 1e-6:
        raise ValueError("Audio vuoto, silenzioso o non valido.")
    return wave

print("Precisione:", DTYPE, "| attenzione:", ATTENTION)
''')
md('## 3 · Genera e ascolta i campioni\nIl riferimento deve dire **esattamente** il testo mostrato: verifica che non ometta o aggiunga parole. Per altre prove cambia descrizione o semi, poi riesegui questa cella.\n')
code('''release_models()
design_model = load_model(DESIGN_MODEL)
candidates = []
try:
    for number, seed in enumerate(CANDIDATE_SEEDS, 1):
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        with torch.inference_mode():
            waves, sr = design_model.generate_voice_design(
                text=REFERENCE_TEXT, language="Italian", instruct=VOICE_DESCRIPTION,
                max_new_tokens=2048, do_sample=True, temperature=0.7)
        wave = checked_audio(waves[0])
        path = WORK / f"reference-{number}.wav"
        sf.write(path, wave, int(sr), subtype="PCM_16")
        metadata = {"text": REFERENCE_TEXT, "description": VOICE_DESCRIPTION,
                    "seed": seed, "model": DESIGN_MODEL, "sample_rate": int(sr)}
        path.with_suffix(".json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
        candidates.append(path)
        print(f"Campione {number}, seme {seed}: {len(wave)/sr:.1f} secondi")
        print(REFERENCE_TEXT)
        display(Audio(filename=str(path)))
finally:
    release_models()
''')
md('## 4 · Selezione della voce\nDopo l’ascolto, imposta `SELECTED_CANDIDATE` a 1 oppure 2 e `REFERENCE_CHECKED` a `True`. Conserva lo ZIP finale: contiene anche il riferimento per riutilizzare la stessa voce in futuro.\n')
code('''SELECTED_CANDIDATE = 1
REFERENCE_CHECKED = False  # True dopo aver ascoltato e verificato il campione scelto
assert REFERENCE_CHECKED, "Ascolta il campione e verifica che corrisponda al testo, poi imposta REFERENCE_CHECKED = True."
assert 1 <= SELECTED_CANDIDATE <= len(CANDIDATE_SEEDS)
REFERENCE_PATH = WORK / f"reference-{SELECTED_CANDIDATE}.wav"
assert REFERENCE_PATH.exists(), "Genera prima i campioni."
reference_metadata = json.loads(REFERENCE_PATH.with_suffix(".json").read_text(encoding="utf-8"))
reference_hash = hashlib.sha256(REFERENCE_PATH.read_bytes()).hexdigest()
OUTPUT = WORK / f"audio-{reference_hash[:10]}-{BASE_MODEL.split('/')[-1]}"
OUTPUT.mkdir(parents=True, exist_ok=True)
print("Riferimento scelto:", REFERENCE_PATH.name)
''')
md('## 5 · Testi dei 23 audio\nPuoi correggere un testo prima della generazione. I nomi dei 18 passaggi corrispondono agli identificativi dell’app. Testi revisionati il 20 novembre 2026. La fonte modificabile è scripts-it.json; dopo una modifica, rigenera questo notebook con build-qwen-notebook.py.\n')
code('AUDIO_SCRIPTS = '+repr(clips)+'\nassert len(AUDIO_SCRIPTS) == 23\nprint("Testi caricati:", len(AUDIO_SCRIPTS))\n')
md('## 6 · Carica il modello Base e prepara la voce\nIl modello VoiceDesign è già stato liberato. Se la memoria non basta, cambia `BASE_MODEL` nella configurazione in `Qwen/Qwen3-TTS-12Hz-0.6B-Base`, riesegui la selezione e riparti da questa cella.\n')
code('''release_models()
clone_model = load_model(BASE_MODEL)
with torch.inference_mode():
    voice_prompt = clone_model.create_voice_clone_prompt(
        ref_audio=str(REFERENCE_PATH), ref_text=reference_metadata["text"],
        x_vector_only_mode=False)
print("Voce pronta per la generazione.")
''')
md('## 7 · Genera tutti gli audio\nUn testo alla volta, suddiviso in frasi per contenere memoria e lunghezza. Le frasi vengono unite con brevi pause. I segmenti validi vengono salvati: rieseguire riprende il lavoro nella stessa sessione. La verifica automatica controlla i file, non la correttezza delle parole pronunciate.\n')
code('''CACHE = OUTPUT / "segments"
CACHE.mkdir(exist_ok=True)
settings = {"model": BASE_MODEL, "reference_sha256": reference_hash,
    "qwen_tts_version": importlib.metadata.version("qwen-tts"),
    "precision": str(DTYPE), "attention": ATTENTION, "language": "Italian",
    "max_new_tokens": 2048, "do_sample": False, "pause_seconds": 0.18}
manifest = {"settings": settings, "reference": reference_metadata,
    "purpose": "Simulazione; pronunce e contenuti da verificare mediante ascolto", "clips": []}
failures = []

def split_text(text):
    sentences = re.split(r"(?<=[.!?;])\\s+", text.strip())
    return [sentence.strip() for sentence in sentences if sentence.strip()]

def save_manifest():
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUTPUT / "errors.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")

for index, clip in enumerate(AUDIO_SCRIPTS, 1):
    try:
        pieces = []
        output_sr = None
        for part_number, text in enumerate(split_text(clip["text"]), 1):
            fingerprint = hashlib.sha256(json.dumps({"text": text, **settings},
                sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            segment_path = CACHE / f"{fingerprint}.wav"
            if segment_path.exists():
                audio, sr = sf.read(segment_path, dtype="float32")
                audio = checked_audio(audio)
            else:
                with torch.inference_mode():
                    waves, sr = clone_model.generate_voice_clone(
                        text=text, language="Italian", voice_clone_prompt=voice_prompt,
                        max_new_tokens=settings["max_new_tokens"], do_sample=False)
                audio = checked_audio(waves[0])
                # A very long output for a short phrase may indicate looping.
                if len(audio) / sr > max(45, len(text) * 0.25):
                    raise ValueError(f"Segmento troppo lungo, possibile ripetizione: {text}")
                sf.write(segment_path, audio, int(sr), subtype="PCM_16")
            if output_sr is None:
                output_sr = int(sr)
            if int(sr) != output_sr:
                raise ValueError("Frequenze di campionamento diverse nello stesso audio.")
            if pieces:
                pieces.append(np.zeros(round(output_sr * settings["pause_seconds"]), dtype=np.float32))
            pieces.append(audio)
        if not pieces:
            raise ValueError("Testo vuoto.")
        combined = checked_audio(np.concatenate(pieces))
        destination = OUTPUT / f"{clip['id']}.wav"
        sf.write(destination, combined, output_sr, subtype="PCM_16")
        (OUTPUT / f"{clip['id']}.txt").write_text(clip["text"], encoding="utf-8")
        # Reopen the actual saved file before listing it in the manifest.
        info = sf.info(destination)
        assert info.frames > 0 and info.samplerate == output_sr
        manifest["clips"].append({**clip, "file": destination.name,
            "sample_rate": output_sr, "duration_seconds": round(info.duration, 2),
            "sha256_audio": hashlib.sha256(destination.read_bytes()).hexdigest()})
        print(f"[{index}/{len(AUDIO_SCRIPTS)}] {destination.name}: {info.duration:.1f} s")
    except Exception as exc:
        failures.append({"id": clip["id"], "error": str(exc)})
        print(f"ERRORE {clip['id']}: {exc}")
        gc.collect()
        torch.cuda.empty_cache()
    save_manifest()

print(f"Completati: {len(manifest['clips'])}/{len(AUDIO_SCRIPTS)}. Errori: {len(failures)}.")
if failures:
    print("Controlla errors.json. Dopo la correzione riesegui questa cella: i segmenti completati saranno riutilizzati.")
else:
    display(Audio(filename=str(OUTPUT / "respiration.wav")))
''')
md('## 8 · ZIP e download\nLo ZIP completo viene creato solo quando tutti i 23 audio sono disponibili. Include WAV, testi, manifest, versione delle librerie e voce di riferimento; esclude la cache dei segmenti. L’opzione di recupero permette di scaricare anche un lavoro incompleto, con nome esplicito.\n')
code('''ALLOW_PARTIAL_DOWNLOAD = False
assert "manifest" in globals(), "Esegui prima la generazione."
complete = len(manifest["clips"]) == len(AUDIO_SCRIPTS) and not failures
assert complete or ALLOW_PARTIAL_DOWNLOAD, "Generazione incompleta. Correggi gli errori o abilita il download parziale."
save_manifest()
shutil.copyfile(REFERENCE_PATH, OUTPUT / "voice-reference.wav")
(OUTPUT / "voice-reference.json").write_text(json.dumps(reference_metadata, ensure_ascii=False, indent=2), encoding="utf-8")
(OUTPUT / "README.txt").write_text(
    "Audio generati con Qwen3-TTS. Contenuti per simulazione, da verificare mediante ascolto.\\n"
    "I file non sono stati collegati automaticamente all'app.\\n"
    "La voce di riferimento e il manifest permettono di identificare le impostazioni usate.\\n"
    "Modelli e codice Qwen: Apache 2.0. Fonte: https://github.com/QwenLM/Qwen3-TTS\\n", encoding="utf-8")
archive = WORK / ("nls-qwen-completo.zip" if complete else "nls-qwen-PARZIALE.zip")
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
    for path in sorted(OUTPUT.iterdir()):
        if path.is_file():
            bundle.write(path, arcname=path.name)
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    wav_names = {name for name in bundle.namelist() if name.endswith(".wav") and name != "voice-reference.wav"}
    assert wav_names == {c["file"] for c in manifest["clips"]}
print(f"ZIP: {archive.name} | {len(manifest['clips'])} audio | {archive.stat().st_size/2**20:.1f} MiB")
from google.colab import files
files.download(str(archive))
''')
nb={'nbformat':4,'nbformat_minor':5,'metadata':{'colab':{'name':'Qwen3-TTS - Audio NLS italiano.ipynb'},'accelerator':'GPU','kernelspec':{'display_name':'Python 3','language':'python','name':'python3'}},'cells':cells}
path=ROOT/'Genera-audio-NLS-Qwen-Colab.ipynb'
path.write_text(json.dumps(nb,ensure_ascii=False,indent=2),encoding='utf-8')
assert len(clips)==23 and len({c['id'] for c in clips})==23
print(f'Creato {path.name}: {sum(c["cell_type"]=="code" for c in cells)} celle di codice, 23 testi. Sintassi Python verificata.')
