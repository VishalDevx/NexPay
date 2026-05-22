"use client";

import { useEffect, useRef, useState } from "react";

export default function ApiReferencePage() {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      const win = window as any;
      if (win.SwaggerUIBundle && ref.current) {
        win.SwaggerUIBundle({
          url: "/api/v1/openapi.json",
          dom_id: "#swagger-ui",
          presets: [win.SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
          deepLinking: true,
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
        });
      }
    };
    document.body.appendChild(script);
  }, [loaded]);

  return (
    <div className="min-h-screen bg-white">
      <div id="swagger-ui" ref={ref} />
    </div>
  );
}
