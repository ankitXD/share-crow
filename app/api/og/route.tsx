import { ImageResponse } from "@vercel/og";

export const runtime = "edge";
export const revalidate = 3600; // Cache for 1 hour

async function getCreepsterFont() {
  try {
    const response = await fetch(
      "https://fonts.gstatic.com/s/creepster/v21/AlZy_zVksqhivTC1q-CbazD4zH8.ttf",
    );
    if (!response.ok) throw new Error("Failed to load font");
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET() {
  const creepsterFont = await getCreepsterFont();

  const imageResponse = new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        width: "1200px",
        height: "630px",
        backgroundColor: "#000000",
        background:
          "radial-gradient(circle at 30% 50%, rgba(34, 34, 34, 0.8) 0%, #000000 100%)",
        position: "relative",
        overflow: "hidden",
        padding: "60px 40px",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px), radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          backgroundPosition: "0 0, 40px 40px",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          zIndex: 1,
          textAlign: "center",
          width: "100%",
        }}
      >
        {/* Top emoji */}
        <div
          style={{
            fontSize: "56px",
          }}
        >
          🐦
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontSize: "96px",
            fontFamily: "Creepster",
            color: "#ffffff",
            margin: 0,
            fontWeight: "400",
            letterSpacing: "3px",
            textShadow: "0 8px 32px rgba(255, 255, 255, 0.3)",
            lineHeight: "1",
          }}
        >
          SHARE CROW
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "32px",
            color: "#cccccc",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: "300",
            letterSpacing: "1px",
          }}
        >
          DISCOVER & SHARE THE BEST MEMES
        </p>

        {/* Divider */}
        <div
          style={{
            width: "300px",
            height: "3px",
            background:
              "linear-gradient(to right, transparent, #ffffff, transparent)",
            opacity: 0.5,
          }}
        />

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            fontSize: "22px",
            color: "#aaaaaa",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <span>✨ Browse</span>
          <span>📤 Upload</span>
          <span>🔥 React</span>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize: "28px",
            color: "#ffffff",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: "bold",
          }}
        >
          🎭 JOIN THE FLOCK 🎭
        </p>
        <p
          style={{
            fontSize: "18px",
            color: "#888888",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          meme.justankit.dev
        </p>
      </div>

      {/* Accent corners */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          border: "2px solid #ffffff",
          opacity: 0.2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          left: "30px",
          width: "60px",
          height: "60px",
          border: "2px solid #ffffff",
          opacity: 0.2,
        }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: creepsterFont
        ? [
            {
              name: "Creepster",
              data: creepsterFont,
              style: "normal",
              weight: 400,
            },
          ]
        : [],
    },
  );

  // Add cache headers
  imageResponse.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  imageResponse.headers.set("Content-Type", "image/png");

  return imageResponse;
}
