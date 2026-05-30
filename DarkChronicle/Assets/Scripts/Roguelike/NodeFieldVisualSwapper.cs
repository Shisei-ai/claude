using UnityEngine;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Activates the visual root that matches the current floor index from NodeFieldContext.
    ///
    /// Setup:
    ///   1. Create one child GameObject per floor under this object (or at scene root).
    ///   2. Fill each group's Root field with that child.
    ///   3. Put tilemaps, parallax layers, and lighting overrides inside each root.
    ///   4. On play, only the root matching FloorIndex becomes active — the others hide.
    ///
    /// The Editor menu item DarkChronicle > Create NodeField Scene auto-creates
    /// four floor roots and wires them here.
    /// </summary>
    public sealed class NodeFieldVisualSwapper : MonoBehaviour
    {
        [SerializeField] FloorVisualGroup[] _floorGroups;

        void Start()
        {
            int floor = NodeFieldContext.Current?.FloorIndex ?? 0;

            for (int i = 0; i < _floorGroups.Length; i++)
            {
                var root = _floorGroups[i]?.Root;
                if (root != null) root.SetActive(i == floor);
            }
        }

#if UNITY_EDITOR
        // Show which group will be active in the Editor without entering play mode.
        [UnityEngine.ContextMenu("Preview Floor 0")]
        void PreviewFloor0() => PreviewFloor(0);
        [UnityEngine.ContextMenu("Preview Floor 1")]
        void PreviewFloor1() => PreviewFloor(1);
        [UnityEngine.ContextMenu("Preview Floor 2")]
        void PreviewFloor2() => PreviewFloor(2);
        [UnityEngine.ContextMenu("Preview Floor 3")]
        void PreviewFloor3() => PreviewFloor(3);

        void PreviewFloor(int floor)
        {
            for (int i = 0; i < _floorGroups.Length; i++)
            {
                var root = _floorGroups[i]?.Root;
                if (root != null) root.SetActive(i == floor);
            }
        }
#endif
    }

    [System.Serializable]
    public class FloorVisualGroup
    {
        public string     FloorLabel;  // inspector label, e.g. "廃墟の回廊"
        public GameObject Root;        // parent of all tilemap/parallax/lighting for this floor
    }
}
