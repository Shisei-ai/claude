// HD-2D Sprite Shader
// Octopath Traveler-style pixel art sprite with 3D lighting, rim light, shadow, and emissive support.
Shader "DarkChronicle/HD2DSprite"
{
    Properties
    {
        _MainTex        ("Sprite Texture",      2D)     = "white" {}
        _NormalMap      ("Normal Map",          2D)     = "bump"  {}
        _EmissiveTex    ("Emissive Texture",    2D)     = "black" {}
        _Color          ("Tint Color",          Color)  = (1,1,1,1)
        _EmissiveColor  ("Emissive Color",      Color)  = (0,0,0,0)
        _EmissiveIntensity ("Emissive Intensity", Float) = 1.0
        _RimColor       ("Rim Light Color",     Color)  = (0.3,0.5,1,1)
        _RimPower       ("Rim Light Power",     Float)  = 3.0
        _RimIntensity   ("Rim Light Intensity", Float)  = 0.6
        _ShadowIntensity("Shadow Intensity",    Float)  = 0.7
        _PixelSnap      ("Pixel Snap",          Float)  = 0
        _AlphaCutoff    ("Alpha Cutoff",        Range(0,1)) = 0.1
        _OutlineWidth   ("Outline Width",       Float)  = 0.003
        _OutlineColor   ("Outline Color",       Color)  = (0.1,0.05,0.15,1)
    }

    SubShader
    {
        Tags
        {
            "Queue"             = "Transparent"
            "RenderType"        = "TransparentCutout"
            "RenderPipeline"    = "UniversalPipeline"
            "IgnoreProjector"   = "True"
        }

        // ── Pass 1: Outline (back-face expansion) ──────────────────────────
        Pass
        {
            Name "Outline"
            Tags { "LightMode" = "UniversalForward" }
            Cull Front
            ZWrite On
            Blend SrcAlpha OneMinusSrcAlpha

            HLSLPROGRAM
            #pragma vertex   OutlineVert
            #pragma fragment OutlineFrag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            float4 _MainTex_ST;
            float4 _OutlineColor;
            float  _OutlineWidth;
            float  _AlphaCutoff;

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; float3 normalOS : NORMAL; };
            struct Varyings   { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings OutlineVert(Attributes IN)
            {
                Varyings OUT;
                float3 normalWS = normalize(TransformObjectToWorldNormal(IN.normalOS));
                float3 posWS    = TransformObjectToWorld(IN.positionOS.xyz)
                                  + normalWS * _OutlineWidth;
                OUT.positionHCS = TransformWorldToHClip(posWS);
                OUT.uv          = TRANSFORM_TEX(IN.uv, _MainTex);
                return OUT;
            }

            half4 OutlineFrag(Varyings IN) : SV_Target
            {
                half4 col = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv);
                clip(col.a - _AlphaCutoff);
                return half4(_OutlineColor.rgb, col.a * _OutlineColor.a);
            }
            ENDHLSL
        }

        // ── Pass 2: Main HD-2D Lit Pass ───────────────────────────────────
        Pass
        {
            Name "HD2DLit"
            Tags { "LightMode" = "UniversalForward" }
            Cull Off
            ZWrite On
            Blend SrcAlpha OneMinusSrcAlpha

            HLSLPROGRAM
            #pragma vertex   HD2DVert
            #pragma fragment HD2DFrag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile _ _SHADOWS_SOFT
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

            TEXTURE2D(_MainTex);    SAMPLER(sampler_MainTex);
            TEXTURE2D(_NormalMap);  SAMPLER(sampler_NormalMap);
            TEXTURE2D(_EmissiveTex);SAMPLER(sampler_EmissiveTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _Color;
                float4 _EmissiveColor;
                float  _EmissiveIntensity;
                float4 _RimColor;
                float  _RimPower;
                float  _RimIntensity;
                float  _ShadowIntensity;
                float  _PixelSnap;
                float  _AlphaCutoff;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float4 tangentOS  : TANGENT;
                float2 uv         : TEXCOORD0;
                float4 color      : COLOR;
            };

            struct Varyings
            {
                float4 positionHCS  : SV_POSITION;
                float2 uv           : TEXCOORD0;
                float3 positionWS   : TEXCOORD1;
                float3 normalWS     : TEXCOORD2;
                float3 tangentWS    : TEXCOORD3;
                float3 bitangentWS  : TEXCOORD4;
                float3 viewDirWS    : TEXCOORD5;
                float4 shadowCoord  : TEXCOORD6;
                float4 vertColor    : COLOR;
                float  fogFactor    : TEXCOORD7;
            };

            Varyings HD2DVert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs posInputs  = GetVertexPositionInputs(IN.positionOS.xyz);
                VertexNormalInputs   normInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);

                float3 posOS = IN.positionOS.xyz;
                if (_PixelSnap > 0.5)
                {
                    // Pixel snap: round to nearest pixel in clip space
                    float4 clipPos = posInputs.positionCS;
                    clipPos.xy     = floor(clipPos.xy / clipPos.w * 0.5 + 0.5) * 2.0 - 1.0;
                    clipPos.xy    *= clipPos.w;
                    OUT.positionHCS = clipPos;
                }
                else
                {
                    OUT.positionHCS = posInputs.positionCS;
                }

                OUT.uv           = TRANSFORM_TEX(IN.uv, _MainTex);
                OUT.positionWS   = posInputs.positionWS;
                OUT.normalWS     = normInputs.normalWS;
                OUT.tangentWS    = normInputs.tangentWS;
                OUT.bitangentWS  = normInputs.bitangentWS;
                OUT.viewDirWS    = GetWorldSpaceViewDir(posInputs.positionWS);
                OUT.shadowCoord  = GetShadowCoord(posInputs);
                OUT.vertColor    = IN.color;
                OUT.fogFactor    = ComputeFogFactor(posInputs.positionCS.z);
                return OUT;
            }

            half4 HD2DFrag(Varyings IN) : SV_Target
            {
                // ── Sample textures ───────────────────────────────────────
                half4 albedo   = SAMPLE_TEXTURE2D(_MainTex,     sampler_MainTex,    IN.uv) * _Color * IN.vertColor;
                half3 normalTS = UnpackNormal(SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv));
                half4 emissive = SAMPLE_TEXTURE2D(_EmissiveTex, sampler_EmissiveTex, IN.uv);

                clip(albedo.a - _AlphaCutoff);

                // ── Normal mapping ────────────────────────────────────────
                float3x3 TBN       = float3x3(normalize(IN.tangentWS),
                                              normalize(IN.bitangentWS),
                                              normalize(IN.normalWS));
                float3 normalWS    = normalize(mul(normalTS, TBN));

                // ── Main light ────────────────────────────────────────────
                Light mainLight    = GetMainLight(IN.shadowCoord);
                half3 lightDir     = normalize(mainLight.direction);
                half  NdotL        = max(0.0, dot(normalWS, lightDir));
                half  shadow       = mainLight.shadowAttenuation;
                half  shadowedNdotL = lerp(NdotL * shadow, NdotL, 1.0 - _ShadowIntensity);

                half3 diffuse = mainLight.color * shadowedNdotL;

                // ── Additional lights ─────────────────────────────────────
                #ifdef _ADDITIONAL_LIGHTS
                uint lightCount = GetAdditionalLightsCount();
                for (uint i = 0; i < lightCount; ++i)
                {
                    Light addLight = GetAdditionalLight(i, IN.positionWS, half4(1,1,1,1));
                    half  addNdotL  = max(0.0, dot(normalWS, addLight.direction));
                    diffuse += addLight.color * addNdotL * addLight.distanceAttenuation;
                }
                #endif

                // ── Ambient ───────────────────────────────────────────────
                half3 ambient = SampleSH(normalWS) * 0.4;

                // ── Rim light ─────────────────────────────────────────────
                half3 viewDir  = normalize(IN.viewDirWS);
                half  rim      = pow(1.0 - saturate(dot(viewDir, normalWS)), _RimPower);
                half3 rimLight = _RimColor.rgb * rim * _RimIntensity;

                // ── Combine ───────────────────────────────────────────────
                half3 finalRGB = albedo.rgb * (diffuse + ambient) + rimLight;
                finalRGB += emissive.rgb * _EmissiveColor.rgb * _EmissiveIntensity;

                // ── Fog ───────────────────────────────────────────────────
                finalRGB = MixFog(finalRGB, IN.fogFactor);

                return half4(finalRGB, albedo.a);
            }
            ENDHLSL
        }

        // ── Shadow caster ─────────────────────────────────────────────────
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }
            ZWrite On ZTest LEqual ColorMask 0 Cull Off

            HLSLPROGRAM
            #pragma vertex   ShadowVert
            #pragma fragment ShadowFrag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            float4 _MainTex_ST;
            float  _AlphaCutoff;

            struct Attributes { float4 positionOS:POSITION; float3 normalOS:NORMAL; float2 uv:TEXCOORD0; };
            struct Varyings   { float4 positionHCS:SV_POSITION; float2 uv:TEXCOORD0; };

            Varyings ShadowVert(Attributes IN)
            {
                Varyings OUT;
                float3 posWS    = TransformObjectToWorld(IN.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionHCS = TransformWorldToHClip(ApplyShadowBias(posWS, normalWS, float3(0,0,0)));
                OUT.uv          = TRANSFORM_TEX(IN.uv, _MainTex);
                return OUT;
            }

            half4 ShadowFrag(Varyings IN) : SV_Target
            {
                half4 col = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv);
                clip(col.a - _AlphaCutoff);
                return 0;
            }
            ENDHLSL
        }
    }
    FallBack "Universal Render Pipeline/Lit"
}
