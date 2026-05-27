using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;
using DarkChronicle.Core;

namespace DarkChronicle.World
{
    /// <summary>
    /// Manages the field map: tilemap layers, zone transitions, event triggers,
    /// parallax backgrounds, and area data.
    /// </summary>
    public sealed class WorldMapController : MonoBehaviour
    {
        // ── Tilemap Layers ─────────────────────────────────────────────────
        [Header("Tilemap Layers")]
        [SerializeField] Tilemap _groundLayer;
        [SerializeField] Tilemap _decorationLayer;
        [SerializeField] Tilemap _collisionLayer;
        [SerializeField] Tilemap _shadowLayer;

        // ── Parallax Backgrounds ───────────────────────────────────────────
        [Header("Parallax Layers")]
        [SerializeField] ParallaxLayer[] _parallaxLayers;

        // ── Area Data ──────────────────────────────────────────────────────
        [Header("Area")]
        [SerializeField] AreaData _currentArea;

        // ── Encounter Zones ────────────────────────────────────────────────
        [Header("Encounter Zones")]
        [SerializeField] EncounterZone[] _encounterZones;

        // ── Player Reference ───────────────────────────────────────────────
        Transform _playerTransform;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            var player = FindObjectOfType<Character.PlayerController>();
            if (player != null) _playerTransform = player.transform;
        }

        void Start()
        {
            if (_currentArea != null) ApplyAreaSettings();
        }

        void LateUpdate()
        {
            if (_playerTransform == null) return;
            UpdateParallax();
            CheckEncounterZone();
        }

        // ── Area Setup ─────────────────────────────────────────────────────
        void ApplyAreaSettings()
        {
            if (RenderSettings.fog != _currentArea.HasFog)
                RenderSettings.fog = _currentArea.HasFog;
            if (_currentArea.HasFog)
            {
                RenderSettings.fogColor   = _currentArea.FogColor;
                RenderSettings.fogDensity = _currentArea.FogDensity;
            }

            var atmosphere = FindObjectOfType<HD2D.AtmosphereManager>();
            if (atmosphere != null)
                atmosphere.SetWeather(_currentArea.Weather);
        }

        // ── Parallax ───────────────────────────────────────────────────────
        Vector3 _lastCameraPos;

        void UpdateParallax()
        {
            var cam    = Camera.main;
            if (cam == null) return;
            Vector3 delta = cam.transform.position - _lastCameraPos;
            _lastCameraPos = cam.transform.position;

            foreach (var layer in _parallaxLayers)
                layer.Transform.position += new Vector3(delta.x * layer.ParallaxFactor,
                                                        delta.y * layer.ParallaxFactor * 0.5f, 0f);
        }

        // ── Encounter Zones ────────────────────────────────────────────────
        void CheckEncounterZone()
        {
            foreach (var zone in _encounterZones)
            {
                if (zone.Bounds.Contains(_playerTransform.position))
                {
                    var pc = FindObjectOfType<Character.PlayerController>();
                    pc?.SetEncounterZone(zone.EncounterRateMultiplier);
                    return;
                }
            }
        }

        // ── Public API ─────────────────────────────────────────────────────
        public bool IsWalkable(Vector3 worldPos)
        {
            Vector3Int cell = _collisionLayer.WorldToCell(worldPos);
            return !_collisionLayer.HasTile(cell);
        }

        public AreaData GetCurrentArea() => _currentArea;
    }

    // ── Parallax Layer ─────────────────────────────────────────────────────
    [System.Serializable]
    public class ParallaxLayer
    {
        public Transform Transform;
        [Range(0f, 1f)] public float ParallaxFactor = 0.3f;
    }

    // ── Encounter Zone ─────────────────────────────────────────────────────
    [System.Serializable]
    public class EncounterZone
    {
        public Bounds  Bounds;
        public float   EncounterRateMultiplier = 1f;
        public List<Data.EnemyData> EnemyPool;
    }

    // ── Area Data ──────────────────────────────────────────────────────────
    [CreateAssetMenu(fileName = "AreaData", menuName = "DarkChronicle/Area")]
    public class AreaData : ScriptableObject
    {
        [Header("Identity")]
        public string   AreaName;
        [TextArea] public string Description;
        public AudioClip BGM;

        [Header("Atmosphere")]
        public bool  HasFog;
        public Color FogColor   = new Color(0.08f, 0.05f, 0.12f);
        public float FogDensity = 0.02f;
        public HD2D.WeatherType Weather;

        [Header("Enemies")]
        public List<Data.EnemyData> RandomEncounterPool;
        public float EncounterRateOverride = 0f;   // 0 = use global default

        [Header("Connected Areas")]
        public List<AreaConnection> Connections;
    }

    [System.Serializable]
    public class AreaConnection
    {
        public string   TargetSceneName;
        public Vector3  PlayerSpawnPosition;
        public string   ConnectionName;    // e.g. "North Gate"
    }
}
