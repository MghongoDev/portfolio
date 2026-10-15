import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#05080a",
          backgroundImage:
            "linear-gradient(rgba(151,199,187,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(151,199,187,0.09) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#e9f1ee" }}>
            DM<span style={{ color: "#c8f04b" }}>_</span>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#5c6f6c" }}>github.com/{site.links.githubUser}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#c8f04b", marginBottom: 18, letterSpacing: 4 }}>
            {site.role.toUpperCase()}
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, color: "#e9f1ee", letterSpacing: -2 }}>
            {site.name}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#8fa39e", marginTop: 20, maxWidth: 860 }}>
            Pipelines, models, and dashboards that survive contact with real data.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Python", "SQL", "dbt", "Airflow", "Kafka", "ClickHouse"].map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                fontSize: 20,
                color: "#8fa39e",
                border: "1px solid rgba(151,199,187,0.25)",
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
