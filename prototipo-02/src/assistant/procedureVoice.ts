// Presentation only: source identifiers and clinical rules remain unchanged.
export function procedureVoice(text: string): string {
  return text.replace(/il poster/gi, 'La procedura')
    .replace(/del poster/gi, 'della procedura')
    .replace(/nel poster/gi, 'nella procedura')
    .replace(/dal poster/gi, 'dalla procedura')
    .replace(/\bposter\b/gi, 'procedura');
}
