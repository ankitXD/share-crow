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
        justifyContent: "center",
        width: "1200px",
        height: "630px",
        backgroundColor: "#000000",
        background:
          "radial-gradient(circle at 30% 50%, rgba(34, 34, 34, 0.8) 0%, #000000 100%)",
        position: "relative",
        overflow: "hidden",
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
          gap: "20px",
          zIndex: 1,
          textAlign: "center",
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: "120px",
            fontFamily: "Creepster",
            color: "#ffffff",
            margin: 0,
            fontWeight: "400",
            letterSpacing: "4px",
            textShadow: "0 8px 32px rgba(255, 255, 255, 0.2)",
          }}
        >
          SHARE CROW
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "32px",
            color: "#cccccc",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: "300",
            letterSpacing: "2px",
          }}
        >
          SHARE AND DISCOVER THE BEST MEMES
        </p>

        {/* Divider */}
        <div
          style={{
            width: "200px",
            height: "2px",
            backgroundColor: "#ffffff",
            opacity: 0.3,
            marginTop: "10px",
          }}
        />

        {/* Footer emoji */}
        <div
          style={{
            fontSize: "40px",
            marginTop: "20px",
          }}
        >
          🐦 🎭 🎨
        </div>
      </div>

      {/* Accent corners */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "80px",
          height: "80px",
          border: "2px solid #ffffff",
          opacity: 0.2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          width: "80px",
          height: "80px",
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
