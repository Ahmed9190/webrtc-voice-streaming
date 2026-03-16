import asyncio
import logging
import socket
from av import AudioResampler

logger = logging.getLogger(__name__)

class UDPAudioStreamer:
    def __init__(self, target_ip: str, target_port: int, sample_rate: int = 16000, channels: int = 1):
        """
        Initializes the UDP Audio Streamer.
        
        Args:
            target_ip: The IP address of the destination device (e.g., ESPHome speaker).
            target_port: The UDP port to send audio data to.
            sample_rate: Desired sample rate (default 16kHz for typical voice assistant hardware).
            channels: Number of audio channels (default 1 for mono).
        """
        self.target_ip = target_ip
        self.target_port = target_port
        self.sample_rate = sample_rate
        self.channels = channels
        
        # We need a resampler to ensure incoming WebRTC audio (usually 48kHz stereo or mono)
        # is converted to the raw PCM format the ESPHome speaker expects (e.g., 16kHz mono).
        self.resampler = AudioResampler(
            format="s16",
            layout="mono" if channels == 1 else "stereo",
            rate=sample_rate,
        )
        
        # Create a standard UDP socket
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.is_streaming = False
        
        logger.info(f"Initialized UDP Audio Streamer target={self.target_ip}:{self.target_port} ({self.sample_rate}Hz, {self.channels}ch)")

    def start(self):
        self.is_streaming = True
        logger.info(f"Started UDP streaming to {self.target_ip}:{self.target_port}")

    def stop(self):
        self.is_streaming = False
        if self.sock:
            # We don't close the socket here because we might reuse it, 
            # or we could recreate it. For now, keep it open but stop sending.
            pass
        logger.info(f"Stopped UDP streaming to {self.target_ip}:{self.target_port}")

    def cleanup(self):
        self.is_streaming = False
        if self.sock:
            try:
                self.sock.close()
            except Exception as e:
                logger.error(f"Error closing UDP socket: {e}")
            self.sock = None

    def process_frame(self, frame):
        """
        Process an av.AudioFrame and send via UDP entirely.
        This must be called synchronously or run in an executor if holding up the event loop too much,
        but for small frames it's usually fast enough.
        """
        if not self.is_streaming or not self.sock:
            return

        try:
            # Resample the WebRTC frame to our target format (s16le, 16kHz, mono)
            resampled_frames = self.resampler.resample(frame)
            for resampled_frame in resampled_frames:
                # Get raw PCM bytes
                pcm_data = resampled_frame.planes[0].to_bytes()
                
                # Send the raw bytes over UDP
                # We might want to chunk this if the frame is accidentally huge, 
                # but standard WebRTC frames (20ms/10ms) easily fit in a standard UDP packet MTU (1500 bytes).
                # 20ms of 16kHz 16-bit mono = 640 bytes.
                self.sock.sendto(pcm_data, (self.target_ip, self.target_port))
                
        except Exception as e:
            logger.error(f"Error processing and sending UDP frame: {e}")
