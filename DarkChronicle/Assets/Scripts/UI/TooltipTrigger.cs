using UnityEngine;
using UnityEngine.EventSystems;

namespace DarkChronicle.UI
{
    /// <summary>Attach to any UI element to show a cursor-following tooltip on hover.</summary>
    public sealed class TooltipTrigger : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler
    {
        string _title, _body;
        public void SetText(string title, string body) { _title = title; _body = body; }
        public void OnPointerEnter(PointerEventData e) => TooltipSystem.Instance?.Show(_title, _body);
        public void OnPointerExit (PointerEventData e) => TooltipSystem.Instance?.Hide();
    }
}
