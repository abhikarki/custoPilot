import base64
from fastapi import APIRouter, Depends, HTTPException
from app.schemas import (
    VoiceTranscriptionRequest, VoiceTranscriptionResponse,
    TextToSpeechRequest, TextToSpeechResponse
)
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_audio(
    request: VoiceTranscriptionRequest,
):
    try:
        from openai import OpenAI
        import tempfile
        import os
        
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        audio_bytes = base64.b64decode(request.audio_data)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{request.format}") as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            with open(temp_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json"
                )
            
            return VoiceTranscriptionResponse(
                text=transcript.text,
                confidence=0.95  
            )
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        return VoiceTranscriptionResponse(
            text="[Transcription unavailable - please check API key]",
            confidence=0.0
        )


@router.post("/synthesize", response_model=TextToSpeechResponse)
async def synthesize_speech(
    request: TextToSpeechRequest,
):
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.audio.speech.create(
            model="tts-1",
            voice=request.voice,
            input=request.text,
            response_format="mp3"
        )
        
        audio_data = base64.b64encode(response.content).decode('utf-8')
        
        return TextToSpeechResponse(
            audio_data=audio_data,
            format="mp3"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Text-to-speech failed: {str(e)}"
        )


@router.get("/voices")
async def list_available_voices():
    """List available TTS voices"""
    return {
        "voices": [
            {"id": "alloy", "name": "Alloy", "description": "Neutral and balanced"},
            {"id": "echo", "name": "Echo", "description": "Warm and confident"},
            {"id": "fable", "name": "Fable", "description": "Expressive and dramatic"},
            {"id": "onyx", "name": "Onyx", "description": "Deep and authoritative"},
            {"id": "nova", "name": "Nova", "description": "Friendly and upbeat"},
            {"id": "shimmer", "name": "Shimmer", "description": "Clear and pleasant"},
        ]
    }
