// Shared app icon artwork (used by ImageResponse): white heart-pin on red.
export function IconArt({ size, padded = false }: { size: number; padded?: boolean }) {
  const pin = Math.round(size * (padded ? 0.46 : 0.58));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#E11D2E",
        borderRadius: padded ? 0 : Math.round(size * 0.22),
      }}
    >
      <svg width={pin} height={pin} viewBox="0 0 24 24">
        <path
          fill="#ffffff"
          d="M12 2C7.6 2 4 5.4 4 9.7 4 15.3 12 22 12 22s8-6.7 8-12.3C20 5.4 16.4 2 12 2z"
        />
        <path
          fill="#E11D2E"
          d="M12 13.6s-3.4-2.1-3.4-4.3c0-1.1.9-1.9 1.9-1.9.6 0 1.2.3 1.5.8.3-.5.9-.8 1.5-.8 1 0 1.9.8 1.9 1.9 0 2.2-3.4 4.3-3.4 4.3z"
        />
      </svg>
    </div>
  );
}
