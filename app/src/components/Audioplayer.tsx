// src/components/AudioPlayer.tsx

function AudioPlayer({ src, onEnded }: { src: string; onEnded: () => void }) {
  return (
    <audio controls autoPlay onEnded={onEnded}>
      <source src={src} type="audio/mp3" />
      Your browser does not support the audio element.
    </audio>
  );
}

export default AudioPlayer;
