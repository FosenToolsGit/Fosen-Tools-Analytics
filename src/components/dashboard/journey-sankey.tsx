"use client";

import {
  Sankey,
  Tooltip as RTooltip,
  Layer,
  Rectangle,
} from "recharts";
import type { SankeyNode, SankeyLink } from "@/app/api/customer-journey/route";

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "#34d399",
  Direct: "#60a5fa",
  "Paid Search": "#f97316",
  "Cross-network": "#f97316",
  Email: "#a78bfa",
  "Organic Social": "#ec4899",
  "Paid Social": "#f59e0b",
  Referral: "#14b8a6",
  Unassigned: "#6b7280",
};

const STAGE_COLORS: Record<string, string> = {
  Handlekurv: "#22d3ee",
  Kassen: "#06b6d4",
  "Kjøp": "#0891b2",
  Kontaktskjema: "#0e7490",
};

function nodeColor(name: string): string {
  return (
    CHANNEL_COLORS[name] || STAGE_COLORS[name] || "#6b7280"
  );
}

interface Props {
  data: { nodes: SankeyNode[]; links: SankeyLink[] };
  width?: number;
  height?: number;
}

function CustomNode({
  x,
  y,
  width,
  height,
  payload,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: { name: string; value?: number };
}) {
  const color = nodeColor(payload.name);
  const isLeft = x < 200;
  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        rx={3}
      />
      <text
        x={isLeft ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isLeft ? "end" : "start"}
        dominantBaseline="middle"
        fill="#d1d5db"
        fontSize={12}
      >
        {payload.name}
      </text>
    </Layer>
  );
}

function CustomLink(props: {
  sourceX: number;
  sourceY: number;
  sourceControlX: number;
  targetX: number;
  targetY: number;
  targetControlX: number;
  linkWidth: number;
  payload: { source: { name: string }; target: { name: string }; value: number };
}) {
  const {
    sourceX,
    sourceY,
    sourceControlX,
    targetX,
    targetY,
    targetControlX,
    linkWidth,
    payload,
  } = props;
  const color = nodeColor(payload.source.name);
  return (
    <Layer>
      <path
        d={`
          M${sourceX},${sourceY + linkWidth / 2}
          C${sourceControlX},${sourceY + linkWidth / 2}
            ${targetControlX},${targetY + linkWidth / 2}
            ${targetX},${targetY + linkWidth / 2}
          L${targetX},${targetY - linkWidth / 2}
          C${targetControlX},${targetY - linkWidth / 2}
            ${sourceControlX},${sourceY - linkWidth / 2}
            ${sourceX},${sourceY - linkWidth / 2}
          Z
        `}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeOpacity={0.4}
        strokeWidth={0.5}
      />
    </Layer>
  );
}

export function JourneySankey({ data, width = 700, height = 400 }: Props) {
  if (!data.links || data.links.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500 text-sm">
        Ingen konverteringsdata i perioden
      </div>
    );
  }

  return (
    <Sankey
      width={width}
      height={height}
      data={data}
      nodePadding={24}
      nodeWidth={12}
      node={CustomNode as never}
      link={CustomLink as never}
      margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
    >
      <RTooltip
        contentStyle={{
          backgroundColor: "#111827",
          border: "1px solid #374151",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#f3f4f6",
        }}
        itemStyle={{ color: "#d1d5db" }}
        labelStyle={{ color: "#f3f4f6" }}
      />
    </Sankey>
  );
}
