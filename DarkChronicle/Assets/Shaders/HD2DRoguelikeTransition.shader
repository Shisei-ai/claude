// HD-2D Roguelike Transition Shader
// Used for the node-entry wipe, death dissolve, and floor-clear flash effects.
// Supports: dissolve (noise-based), horizontal wipe, radial iris, and glitch.
Shader "DarkChronicle/RoguelikeTransition"
{
    Properties
    {
        _MainTex        ("Screen Texture",    2D)     = "white" {}
        _NoiseTex       ("Dissolve Noise",    2D)     = "white" {}
        _Progress       ("Transition Progress", Range(0,1)) = 0
        _EdgeWidth      ("Edge Glow Width",   Range(0,0.1)) = 0.03
        _EdgeColor      ("Edge Glow Color",   Color)  = (0.6,0.2,1,1)
        _Mode           ("Mode (0=dissolve,1=wipe,2=iris,3=glitch)", Float) = 0
        _GlitchIntensity("Glitch Intensity",  Range(0,1)) = 0
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Overlay" }
        ZWrite Off ZTest Always Cull Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex   FullscreenVert
            #pragma fragment TransitionFrag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_MainTex);  SAMPLER(sampler_MainTex);
            TEXTURE2D(_NoiseTex); SAMPLER(sampler_NoiseTex);
            float  _Progress;
            float  _EdgeWidth;
            float4 _EdgeColor;
            float  _Mode;
            float  _GlitchIntensity;

            struct Attributes { float4 pos : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings   { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings FullscreenVert(Attributes IN)
            {
                Varyings OUT;
                OUT.pos = TransformObjectToHClip(IN.pos.xyz);
                OUT.uv  = IN.uv;
                return OUT;
            }

            // ── Glitch offset ─────────────────────────────────────────────
            float2 GlitchUV(float2 uv)
            {
                float band    = floor(uv.y * 20.0) / 20.0;
                float seed    = band + _Time.y * 10.0;
                float offset  = (frac(sin(seed * 127.31) * 43758.5) * 2.0 - 1.0)
                              * _GlitchIntensity * 0.05;
                return uv + float2(offset, 0.0);
            }

            half4 TransitionFrag(Varyings IN) : SV_Target
            {
                float2 uv = IN.uv;
                if (_GlitchIntensity > 0.01) uv = GlitchUV(uv);

                half4 screen = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);
                float mask   = 0.0;

                if (_Mode < 0.5)
                {
                    // ── Dissolve (noise) ──────────────────────────────────
                    float noise = SAMPLE_TEXTURE2D(_NoiseTex, sampler_NoiseTex, uv * 1.5).r;
                    mask = step(_Progress, noise);
                    // Edge glow
                    float edge = step(_Progress - _EdgeWidth, noise) * (1.0 - mask);
                    screen.rgb = lerp(screen.rgb, _EdgeColor.rgb, edge * _EdgeColor.a);
                }
                else if (_Mode < 1.5)
                {
                    // ── Horizontal wipe ───────────────────────────────────
                    mask = step(uv.x, _Progress);
                    // Edge
                    float edge = abs(uv.x - _Progress) < _EdgeWidth ? 1.0 : 0.0;
                    screen.rgb = lerp(screen.rgb, _EdgeColor.rgb, edge * _EdgeColor.a * mask);
                }
                else if (_Mode < 2.5)
                {
                    // ── Radial iris ───────────────────────────────────────
                    float2 center = uv - 0.5;
                    float  dist   = length(center);
                    float  radius = _Progress * 0.75;
                    mask  = step(dist, radius);
                    float  edge   = abs(dist - radius) < _EdgeWidth ? 1.0 : 0.0;
                    screen.rgb = lerp(screen.rgb, _EdgeColor.rgb, edge * _EdgeColor.a * mask);
                }
                else
                {
                    // ── Glitch block dissolve ─────────────────────────────
                    float2 blockUV = floor(uv * 16.0) / 16.0;
                    float  noise   = SAMPLE_TEXTURE2D(_NoiseTex, sampler_NoiseTex, blockUV).r;
                    mask = step(_Progress, noise);
                }

                // Black behind mask
                return lerp(screen, half4(0,0,0,1), 1.0 - mask);
            }
            ENDHLSL
        }
    }
}
