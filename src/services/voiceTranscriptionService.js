import { nutriApi } from '@/api/nutriApi';

export async function transcribeFoodAudio(blob) {
  const { file_url } = await nutriApi.integrations.Core.UploadFile({ file: blob });
  return nutriApi.integrations.Core.InvokeLLM({
    task: 'audio_transcription',
    data: {},
    file_urls: [file_url],
    model: 'gemini_3_flash',
  });
}
