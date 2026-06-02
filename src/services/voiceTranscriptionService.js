import { nutriApi } from '@/api/nutriApi';

export async function transcribeFoodAudio(blob) {
  const { file_url } = await nutriApi.integrations.Core.UploadFile({ file: blob });
  return nutriApi.integrations.Core.InvokeLLM({
    prompt:
      'Transcribe the audio accurately into Ukrainian text. Return ONLY the transcribed text, nothing else. The person is describing food they ate.',
    file_urls: [file_url],
    model: 'gemini_3_flash',
  });
}
