// HD-2D Background Shader
// Depth-based blur, parallax layers, atmospheric fog, and vignette for the diorama world effect.
Shader "DarkChronicle/HD2DBackground"
{
    Properties
    {
        _MainTex        ("Background Texture",  2D)     = "white" {}
        _Color          ("Tint",                Color)  = (1,1,1,1)
        _FogColor       ("Atmospheric Fog",     Color)  = (0.1,0.05,0.2,1)
        _FogStart       ("Fog Start Depth",     Float)  = 5.0
        _FogEnd         ("Fog End Depth",       Float)  = 30.0
        _FogDensity     ("Fog Density",         Range(0,1)) = 0.4
        _BlurStrength   ("Depth Blur Strength", Range(0,1)) = 0.3
        _ParallaxScale  ("Parallax Scale",      Float)  = 0.1
        _ScrollSpeedX   ("Scroll Speed X",      Float)  = 0.0
        _ScrollSpeedY   ("Scroll Speed Y",      Float)  = 0.0
        _VignetteIntensity("Vignette Intensity",Range(0,1)) = 0.4
        _VignetteColor  ("Vignette Color",      Color)  = (0,0,0,1)
    }

    SubShader
    {
        Tags { "Queue"="Background" "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Cull Off ZWrite Off ZTest Always

        Pass
        {
            Name "HD2DBackground"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex   BgVert
            #pragma fragment BgFrag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            float4 _MainTex_ST;
            float4 _Color;
            float4 _FogColor;
            float  _FogStart;
            float  _FogEnd;
            float  _FogDensity;
            float  _BlurStrength;
            float  _ParallaxScale;
            float  _ScrollSpeedX;
            float  _ScrollSpeedY;
            float  _VignetteIntensity;
            float4 _VignetteColor;

            struct Attributes { float4 positionOS:POSITION; float2 uv:TEXCOORD0; };
            struct Varyings   { float4 positionHCS:SV_POSITION; float2 uv:TEXCOORD0; float2 screenUV:TEXCOORD1; };

            Varyings BgVert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                float2 scrollOffset = float2(_ScrollSpeedX, _ScrollSpeedY) * _Time.y;
                OUT.uv = TRANSFORM_TEX(IN.uv, _MainTex) + scrollOffset;
                OUT.screenUV = (OUT.positionHCS.xy / OUT.positionHCS.w) * 0.5 + 0.5;
                return OUT;
            }

            // Soft 9-tap box blur for depth-of-field simulation
            half3 BoxBlur(TEXTURE2D_PARAM(tex, samp), float2 uv, float radius)
            {
                float2 texelSize = float2(ddx(uv.x), ddy(uv.y));
                half3 col = 0;
                float weight = 0;
                [unroll]
                for (int x = -1; x <= 1; x++)
                for (int y = -1; y <= 1; y++)
                {
                    float2 offset = float2(x, y) * texelSize * radius * 8.0;
                    col    += SAMPLE_TEXTURE2D(tex, samp, uv + offset).rgb;
                    weight += 1.0;
                }
                return col / weight;
            }

            half4 BgFrag(Varyings IN) : SV_Target
            {
                // Sample with optional blur
                half3 sharp  = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv).rgb;
                half3 blurred = BoxBlur(TEXTURE2D_ARGS(_MainTex, sampler_MainTex), IN.uv, _BlurStrength);
                half3 col = lerp(sharp, blurred, _BlurStrength) * _Color.rgb;

                // Atmospheric fog (depth simulation via object depth)
                float depth = abs(TransformObjectToWorld(float3(0,0,0)).z);
                float fogT  = saturate((depth - _FogStart) / max(_FogEnd - _FogStart, 0.001));
                fogT        = fogT * fogT * _FogDensity;
                col = lerp(col, _FogColor.rgb, fogT);

                // Vignette
                float2 vc   = IN.screenUV * 2.0 - 1.0;
                float  vign = 1.0 - dot(vc, vc) * _VignetteIntensity;
                col = lerp(_VignetteColor.rgb, col, saturate(vign));

                return half4(col, 1.0);
            }
            ENDHLSL
        }
    }
}
