"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, Upload, AlertCircle, RefreshCw, SwitchCamera, ZoomIn } from "lucide-react";
import Button from "@/components/ui/Button";
import { canAutoCapture, toCaptureIntervalMs } from "@/lib/capture-scheduler";
import { detectarPeca } from "@/lib/api";

const INTERVALO_DETECCAO_MS = 2000;
const LARGURA_FRAME_DETECCAO = 384;

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void;
  disabled?: boolean;
}

interface ZoomCapability {
  min: number;
  max: number;
  step: number;
}

export default function WebcamCapture({ onCapture, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tentando, setTentando] = useState(false);
  const [capturaAutomatica, setCapturaAutomatica] = useState(false);
  const [intervaloSegundos, setIntervaloSegundos] = useState(5);
  const [proximaCaptura, setProximaCaptura] = useState<number | null>(null);
  const [pecaPresente, setPecaPresente] = useState(false);
  const [aguardandoRetirada, setAguardandoRetirada] = useState(false);
  const [erroDeteccao, setErroDeteccao] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [multiplasCameras, setMultiplasCameras] = useState(false);
  const [zoomCapability, setZoomCapability] = useState<ZoomCapability | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

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

    // 3. Tenta constraints progressivamente mais permissivos, priorizando o facingMode atual
    const outroFacingMode = facingMode === "environment" ? "user" : "environment";
    const tentativas: MediaStreamConstraints[] = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: facingMode } } },
      { video: { facingMode: { ideal: facingMode } } },
      { video: { facingMode: { ideal: outroFacingMode } } },
      { video: true },
    ];

    let lastError: unknown = null;

    for (const constraint of tentativas) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        streamRef.current = stream;

        // Só depois da permissão concedida o navegador revela a lista completa de câmeras
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter((d) => d.kind === "videoinput");
          setMultiplasCameras(cameras.length > 1);
        } catch {
          // Segue sem o botão de troca caso a enumeração falhe
        }

        const [track] = stream.getVideoTracks();
        const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: ZoomCapability }) | undefined;
        if (capabilities?.zoom && capabilities.zoom.max > capabilities.zoom.min) {
          setZoomCapability(capabilities.zoom);
          const settings = track.getSettings?.() as (MediaTrackSettings & { zoom?: number }) | undefined;
          setZoom(settings?.zoom ?? capabilities.zoom.min);
        } else {
          setZoomCapability(null);
          setZoom(null);
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.onloadedmetadata = () => {
            video.play().catch((err) => {
              console.warn("[WebcamCapture] Erro ao reproduzir vídeo:", err);
            });
            setReady(true);
          };
          video.play().then(() => setReady(true)).catch(() => {});
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
  }, [facingMode, pararStream]);

  const alternarCamera = useCallback(() => {
    setFacingMode((atual) => (atual === "environment" ? "user" : "environment"));
  }, []);

  const alterarZoom = useCallback((valor: number) => {
    setZoom(valor);
    const track = streamRef.current?.getVideoTracks()[0];
    track?.applyConstraints({ advanced: [{ zoom: valor } as MediaTrackConstraintSet] }).catch((err) => {
      console.warn("[WebcamCapture] Erro ao aplicar zoom:", err);
    });
  }, []);

  // Garante que o stream seja anexado ao elemento de vídeo sempre que ambos existirem
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      video.play().catch((e) => console.warn("[WebcamCapture] play error:", e));
      setReady(true);
    }
  }, [tentando]);

  useEffect(() => {
    startCamera();
    return () => pararStream();
  }, [startCamera, pararStream]);

  const capturar = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !ready || disabled) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onCapture(blob, dataUrl);
    }, "image/jpeg", 0.85);
  }, [disabled, onCapture, ready]);

  // Frame pequeno só para a detecção (barato); a foto da peça continua em resolução cheia
  const capturarFrameDeteccao = useCallback((): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return Promise.resolve(null);
    const escala = Math.min(1, LARGURA_FRAME_DETECCAO / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
  }, []);

  // Com a captura automática ligada, a IA verifica periodicamente se há peça na frente da câmera
  useEffect(() => {
    if (!capturaAutomatica || !ready || disabled) return;

    let cancelado = false;
    let timer: number | undefined;

    const verificar = async () => {
      try {
        const frame = await capturarFrameDeteccao();
        if (cancelado) return;
        if (!frame) {
          timer = window.setTimeout(verificar, INTERVALO_DETECCAO_MS);
          return;
        }
        const presente = await detectarPeca(frame);
        if (cancelado) return;
        setErroDeteccao(false);
        setPecaPresente(presente);
        if (!presente) setAguardandoRetirada(false);
      } catch (err) {
        if (cancelado) return;
        console.warn("[WebcamCapture] Falha ao detectar peça:", err);
        setErroDeteccao(true);
        setPecaPresente(false);
      }
      if (!cancelado) timer = window.setTimeout(verificar, INTERVALO_DETECCAO_MS);
    };
    verificar();

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [capturaAutomatica, capturarFrameDeteccao, disabled, ready]);

  useEffect(() => {
    if (!capturaAutomatica) {
      setPecaPresente(false);
      setAguardandoRetirada(false);
      setErroDeteccao(false);
    }
  }, [capturaAutomatica]);

  // O tempo só corre enquanto houver peça detectada e a anterior já tiver sido retirada
  useEffect(() => {
    if (!canAutoCapture({
      automatic: capturaAutomatica,
      ready,
      processing: !!disabled,
      garmentPresent: pecaPresente,
      awaitingRemoval: aguardandoRetirada,
    })) {
      setProximaCaptura(null);
      return;
    }

    const intervalo = toCaptureIntervalMs(intervaloSegundos);
    const fim = Date.now() + intervalo;
    setProximaCaptura(Math.ceil(intervalo / 1000));

    const contador = window.setInterval(() => {
      setProximaCaptura(Math.max(0, Math.ceil((fim - Date.now()) / 1000)));
    }, 250);
    const agendamento = window.setTimeout(() => {
      setAguardandoRetirada(true);
      capturar();
    }, intervalo);

    return () => {
      window.clearInterval(contador);
      window.clearTimeout(agendamento);
    };
  }, [aguardandoRetirada, capturaAutomatica, capturar, disabled, intervaloSegundos, pecaPresente, ready]);

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
          <div className="w-full h-full rounded-full bg-neutral-900 relative overflow-hidden flex items-center justify-center p-1">
            {/* O vídeo fica permanentemente no DOM para nunca perder o stream */}
            <video
              ref={videoRef}
              className={`w-full h-full rounded-full object-cover transition-opacity duration-300 ${
                ready && !error ? "opacity-100" : "opacity-0"
              }`}
              autoPlay
              muted
              playsInline
            />

            {/* Spinner enquanto carrega */}
            {tentando && !error && (
              <div className="absolute inset-0 bg-brand-bg rounded-full flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
                <span className="text-[11px] font-inter text-brand-text/50">Iniciando câmera...</span>
              </div>
            )}

            {/* Mensagem de erro */}
            {error && (
              <div className="absolute inset-0 bg-brand-bg rounded-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <AlertCircle size={28} className="text-brand-rose/60" strokeWidth={1.5} />
                <p className="text-xs text-brand-text/70 font-inter leading-relaxed">{error}</p>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-dark font-poppins font-medium transition-colors"
                >
                  <RefreshCw size={13} strokeWidth={2} />
                  Tentar novamente
                </button>
              </div>
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

        {/* Botão de troca de câmera (frontal/traseira) */}
        {!error && multiplasCameras && (
          <button
            onClick={alternarCamera}
            disabled={disabled || tentando}
            title="Trocar câmera"
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white shadow-gold flex items-center justify-center disabled:opacity-50"
            style={{ border: "1.5px solid rgba(212,175,55,0.3)" }}
          >
            <SwitchCamera size={18} className="text-brand-gold" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!error && zoomCapability && zoom !== null && (
        <div className="flex items-center gap-2 w-full max-w-sm">
          <ZoomIn size={16} className="text-brand-text/50 shrink-0" strokeWidth={1.5} />
          <input
            type="range"
            min={zoomCapability.min}
            max={zoomCapability.max}
            step={zoomCapability.step}
            value={zoom}
            onChange={(e) => alterarZoom(Number(e.target.value))}
            disabled={disabled}
            className="w-full accent-brand-gold"
          />
        </div>
      )}

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

      {!error && (
        <div className="w-full max-w-sm rounded-xl border border-brand-gold/15 bg-brand-bg px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-poppins text-brand-text cursor-pointer">
              <input
                type="checkbox"
                checked={capturaAutomatica}
                onChange={(event) => setCapturaAutomatica(event.target.checked)}
                disabled={!ready || disabled}
                className="accent-brand-gold"
              />
              Captura automática
            </label>
            <label className="flex items-center gap-1 text-xs text-brand-text/60">
              A cada
              <input
                type="number"
                min="1"
                max="60"
                value={intervaloSegundos}
                onChange={(event) => setIntervaloSegundos(Math.min(60, Math.max(1, Number(event.target.value) || 1)))}
                disabled={!capturaAutomatica || disabled}
                className="w-12 rounded-md border border-brand-gold/20 bg-white px-1 py-0.5 text-center text-sm text-brand-text disabled:opacity-50"
              />
              segundos
            </label>
          </div>
          {capturaAutomatica && (
            <p className="mt-2 text-center text-xs text-brand-text/55">
              {erroDeteccao
                ? "Detecção de peça indisponível. Use o botão Capturar Peça."
                : aguardandoRetirada
                  ? "Retire a peça para registrar a próxima."
                  : proximaCaptura !== null
                    ? `Peça detectada. Captura em ${proximaCaptura}s`
                    : "Aguardando uma peça na frente da câmera..."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
