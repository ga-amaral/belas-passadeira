"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, Upload, AlertCircle, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void;
  disabled?: boolean;
}

export default function WebcamCapture({ onCapture, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tentando, setTentando] = useState(false);

  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    pararStream();
    setReady(false);
    setError(null);
    setTentando(true);

    // 1. Verifica contexto seguro (HTTPS ou localhost)
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setError("O navegador bloqueia o uso da câmera em conexões HTTP sem SSL. Acesse usando HTTPS ou por localhost.");
      setTentando(false);
      return;
    }

    // 2. Verifica se a API de mídia existe
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Seu navegador não suporta acesso direto à câmera. Use o botão abaixo para enviar foto.");
      setTentando(false);
      return;
    }

    // 3. Tenta constraints progressivamente mais permissivos (usando 'ideal' para não falhar em webcam desktop)
    const tentativas: MediaStreamConstraints[] = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: { ideal: "environment" } } },
      { video: { facingMode: { ideal: "user" } } },
      { video: true },
    ];

    let lastError: unknown = null;

    for (const constraint of tentativas) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        streamRef.current = stream;
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play().catch((err) => {
              console.warn("[WebcamCapture] Erro ao reproduzir vídeo:", err);
            });
            setReady(true);
          };
        } else {
          setReady(true);
        }
        setTentando(false);
        return;
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError instanceof Error) {
      console.error("[WebcamCapture] Falha ao acessar câmera:", lastError);
      if (lastError.name === "NotAllowedError" || lastError.name === "PermissionDeniedError") {
        setError("Permissão negada no navegador. Clique no ícone de cadeado/câmera na barra de endereço para permitir o acesso.");
      } else if (lastError.name === "NotReadableError" || lastError.name === "TrackStartError") {
        setError("A câmera está em uso por outro aplicativo (Zoom, Teams, etc.) ou travada pelo Windows.");
      } else if (lastError.name === "NotFoundError" || lastError.name === "DevicesNotFoundError") {
        setError("Nenhuma câmera foi encontrada pelo navegador.");
      } else if (lastError.name === "OverconstrainedError") {
        setError("A resolução solicitada não é suportada pela câmera.");
      } else {
        setError(`Erro na câmera: ${lastError.message || lastError.name}. Use o envio de foto.`);
      }
    } else {
      setError("Câmera não disponível ou permissão negada. Use o botão abaixo para enviar uma foto.");
    }
    setTentando(false);
  }, [pararStream]);

  useEffect(() => {
    startCamera();
    return () => pararStream();
  }, [startCamera, pararStream]);

  function capturar() {
    if (!videoRef.current || !canvasRef.current || !ready) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onCapture(blob, dataUrl);
    }, "image/jpeg", 0.85);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onCapture(file, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera frame */}
      <div className="relative w-72 h-72">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #D4AF37 0%, #E8C84A 20%, #D4AF37 40%, #B8971F 60%, #D4AF37 80%, #E8C84A 100%)",
            padding: "3px",
          }}
        >
          <div className="w-full h-full rounded-full bg-white p-1">
            {error ? (
              <div className="w-full h-full rounded-full bg-brand-bg flex flex-col items-center justify-center gap-3 p-6 text-center">
                <AlertCircle size={28} className="text-brand-rose/60" strokeWidth={1.5} />
                <p className="text-xs text-brand-text/50 font-inter leading-relaxed">{error}</p>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-dark font-poppins font-medium transition-colors"
                >
                  <RefreshCw size={13} strokeWidth={2} />
                  Tentar novamente
                </button>
              </div>
            ) : tentando ? (
              <div className="w-full h-full rounded-full bg-brand-bg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full rounded-full object-cover"
                autoPlay
                muted
                playsInline
              />
            )}
          </div>
        </div>

        {/* Cabide decoration */}
        <div
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white shadow-gold flex items-center justify-center"
          style={{ border: "1.5px solid rgba(212,175,55,0.3)" }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 3a2 2 0 0 1 2 2v1L20 13H4L10 6V5a2 2 0 0 1 2-2z" />
            <path d="M4 13v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
          </svg>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3 flex-wrap justify-center">
        {!error && (
          <Button onClick={capturar} disabled={!ready || disabled} size="lg">
            <Camera size={18} strokeWidth={1.5} />
            Capturar Peça
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
        >
          <Upload size={16} strokeWidth={1.5} />
          {error ? "Enviar Foto" : "Upload"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
