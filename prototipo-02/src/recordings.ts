// These recordings match the current workflow. The other imported files contain
// superseded instructions for entering measurements and must not be played.
const playable=new Set(['preparation','cord','skin','first-actions','distress-support','ppv','correctives','compressions','medication','recovery-review','post','saturation','mrsopa','doppes','help','finished'])
export function recordingUrl(id:string){return playable.has(id)?`${import.meta.env.BASE_URL}audio/qwen/${id}.wav`:null}
