import apiClient from './api-client';

export type VoiceStep =
  | 'CROP'
  | 'QUANTITY'
  | 'UNIT'
  | 'AVAILABILITY'
  | 'PRICE'
  | 'DESCRIPTION';

export interface VoiceSession {
  _id: string;
  farmerId: string;
  status: string;
  createdAt: string;
}

interface RawVoiceSession {
  uuid?: string;
  _id?: string;
  farmerId?: string;
  farmer?: { uuid: string };
  status: string;
  createdAt: string;
}

function mapSession(raw: RawVoiceSession): VoiceSession {
  return {
    _id: raw.uuid ?? raw._id ?? '',
    farmerId: raw.farmerId ?? raw.farmer?.uuid ?? '',
    status: raw.status,
    createdAt: raw.createdAt,
  };
}

export interface UploadVoiceResponseResult {
  transcript: string;
  step: VoiceStep;
}

export const voiceApi = {
  createVoiceSession: async (farmerId: string): Promise<VoiceSession> => {
    const { data } = await apiClient.post<{ success: boolean; data: { session: RawVoiceSession } }>(
      '/voice-sessions',
      { farmerId }
    );
    return mapSession(data.data.session);
  },

  uploadVoiceResponse: async (
    sessionId: string,
    payload: { audioBlob: Blob; step: VoiceStep; language: string }
  ): Promise<UploadVoiceResponseResult> => {
    const formData = new FormData();
    formData.append('audio', payload.audioBlob, `recording-${payload.step}.webm`);
    formData.append('step', payload.step);
    formData.append('language', payload.language);

    const { data } = await apiClient.post<{
      success: boolean;
      data: { transcript: string; step: VoiceStep };
    }>(`/voice-sessions/${sessionId}/responses`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  editVoiceResponse: async (
    sessionId: string,
    step: VoiceStep,
    editedTranscript: string
  ): Promise<void> => {
    await apiClient.patch(`/voice-sessions/${sessionId}/responses/${step}`, {
      editedTranscript,
    });
  },

  completeVoiceSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/voice-sessions/${sessionId}/complete`);
  },
};
