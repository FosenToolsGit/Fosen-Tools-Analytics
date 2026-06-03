// FTHvorforHDFI — direkte salgs-pitch i "3 grunner"-format. Hver grunn
// får sin egen 100-frame card i Scene 2: stor nummer (01/02/03),
// title, body-tekst. Avsluttes med closing-tagline + sterk CTA.
//
//   0-90    Hook B: Eyebrow Slam "HVORFOR HDFI" / "TRE GRUNNER"
//   75-99   FTTransition (wipe-warm + Whoosh Sweep)
//   90-450  Scene 2: 3 grunner sekvensielt + closing-tagline
//   435-465 FTTransition (light-leak-middle)
//   450-600 Scene 3: FTOutroCta med "Få en demo"-CTA

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { AmbientLayer } from "../components/AmbientLayer";
import { FTHook } from "../components/hooks/FTHook";
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed, sfx, sfxVolume } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTHvorforHDFIProps } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 450;
const OUTRO_START = 450;
const REASON_DURATION = 100;

export const FTHvorforHDFI: React.FC<FTHvorforHDFIProps> = ({
  eyebrow,
  headline,
  reasons,
  closingTagline,
  ctaUrl,
  tagline,
}) => {
  return (
    <AbsoluteFill>
      <AmbientLayer variant="ink" />

      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook kind="eyebrow-slam" eyebrow={eyebrow} primaryText={headline} />
      </Sequence>

      <FTTransition from={75} kind="wipe-warm" />

      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <HvorforScene2 reasons={reasons} closingTagline={closingTagline} />
      </Sequence>

      {/* Soft-sweep ved hver grunn-overgang */}
      {reasons.slice(0, 3).map((_, i) => (
        <Sequence
          key={i}
          from={LOADING_END + i * REASON_DURATION + 2}
          durationInFrames={2}
        >
          <Audio src={sfx("soft-sweep")} volume={sfxVolume("soft-sweep") * 0.5} />
        </Sequence>
      ))}

      <FTTransition from={OUTRO_START - 15} kind="light-leak-middle" />

      <Sequence from={OUTRO_START} durationInFrames={150}>
        <FTOutroCta
          tagline={tagline ?? "Egen CADLAB · CNC-maskinert"}
          url={ctaUrl ?? "fosen-tools.no/hdfi"}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const HvorforScene2: React.FC<{
  reasons: FTHvorforHDFIProps["reasons"];
  closingTagline: string;
}> = ({ reasons, closingTagline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const localFrame = frame - 20;
  const allReasons = reasons.slice(0, 3);
  const activeReason = Math.min(
    Math.max(0, Math.floor(localFrame / REASON_DURATION)),
    allReasons.length - 1,
  );
  const reasonLocal = localFrame - activeReason * REASON_DURATION;

  // Fade-in 0-15, hold, fade-ut siste 15 (men siste grunn fader til closing)
  const reasonInT = interpolate(reasonLocal, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reasonOutT =
    activeReason < allReasons.length - 1
      ? interpolate(
          reasonLocal,
          [REASON_DURATION - 15, REASON_DURATION],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 1;
  const reasonT = reasonInT * reasonOutT;

  const reason = allReasons[activeReason]!;

  // Closing-tagline kommer på slutten
  const closingStart = LOADING_END + REASON_DURATION * 3 + 20 - LOADING_END;
  const closingT = interpolate(frame, [closingStart, closingStart + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Stor nummer-badge */}
      <div
        style={{
          position: "absolute",
          top: height * 0.12,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: reasonT,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 200,
            fontWeight: 800,
            color: FT.red,
            letterSpacing: -8,
            lineHeight: 0.85,
            textShadow: `0 0 40px rgba(237, 28, 36, 0.4)`,
          }}
        >
          {String(activeReason + 1).padStart(2, "0")}
        </div>
      </div>

      {/* Reason title */}
      <div
        style={{
          position: "absolute",
          top: height * 0.39,
          left: width * 0.08,
          right: width * 0.08,
          opacity: reasonT,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 76,
            fontWeight: 800,
            color: FT.white,
            letterSpacing: 0.5,
            lineHeight: 1.0,
            textTransform: "uppercase",
            textShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
          }}
        >
          {reason.title}
        </div>
        {/* FT-rød underline */}
        <div
          style={{
            margin: "20px auto 0",
            width: 140,
            height: 6,
            background: FT.red,
            boxShadow: `0 0 16px ${FT.red}aa`,
          }}
        />
      </div>

      {/* Reason body */}
      <div
        style={{
          position: "absolute",
          top: height * 0.58,
          left: width * 0.1,
          right: width * 0.1,
          opacity: reasonT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.85)",
            fontWeight: 500,
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          {reason.body}
        </div>
      </div>

      {/* Closing-tagline kommer på slutten av Scene 2 */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.06,
          left: width * 0.08,
          right: width * 0.08,
          opacity: closingT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 34,
            color: FT.red,
            fontWeight: 700,
            textAlign: "center",
            letterSpacing: 0.3,
            padding: "16px 32px",
            border: `2px solid ${FT.red}`,
            background: "rgba(237, 28, 36, 0.08)",
          }}
        >
          {closingTagline}
        </div>
      </div>

      {/* Progress-pip nederst */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.22,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          opacity: 1 - closingT,
        }}
      >
        {allReasons.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeReason ? 32 : 10,
              height: 6,
              borderRadius: 3,
              background: i <= activeReason ? FT.red : "rgba(255, 255, 255, 0.18)",
              boxShadow: i === activeReason ? `0 0 10px ${FT.red}` : "none",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
