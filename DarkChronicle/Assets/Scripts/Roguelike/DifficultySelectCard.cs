using System.Text;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// One card in the difficulty selection screen.
    /// Setup by RoguelikeManager.DifficultySelect; clicking the card fires onSelect.
    ///
    /// Unity Inspector setup:
    ///   - NameText        : tier level + display name
    ///   - DescText        : flavour description
    ///   - StatsText       : numerical modifiers
    ///   - SelectButton    : confirms this difficulty
    ///   - LockedOverlay   : shown when tier not yet unlocked
    ///   - SelectedFrame   : highlight when this card is chosen
    /// </summary>
    public sealed class DifficultySelectCard : MonoBehaviour
    {
        [SerializeField] TextMeshProUGUI _nameText;
        [SerializeField] TextMeshProUGUI _descText;
        [SerializeField] TextMeshProUGUI _statsText;
        [SerializeField] Button          _selectButton;
        [SerializeField] GameObject      _lockedOverlay;
        [SerializeField] GameObject      _selectedFrame;

        System.Action _onSelect;

        public void Setup(DifficultyTier tier, bool locked, System.Action onSelect)
        {
            _onSelect = locked ? null : onSelect;

            if (_nameText  != null) _nameText.text = $"【{(int)tier.Level}】{tier.DisplayName}";
            if (_descText  != null) _descText.text = tier.Description;

            if (_statsText != null)
            {
                var sb = new StringBuilder();
                sb.AppendLine($"敵HP    × {tier.EnemyHPMult:F2}");
                sb.AppendLine($"敵攻撃  × {tier.EnemyDamageMult:F2}");
                sb.AppendLine($"初期ゴールド  {tier.StartingGold}G");
                if (tier.ExtraEliteShields    > 0) sb.AppendLine($"エリート盾  +{tier.ExtraEliteShields}");
                if (tier.ExtraAllEnemyShields > 0) sb.AppendLine($"全敵盾      +{tier.ExtraAllEnemyShields}");
                if (tier.StartWithCurse)            sb.AppendLine("呪いを1つ持って開始");
                _statsText.text = sb.ToString().TrimEnd();
            }

            if (_lockedOverlay != null) _lockedOverlay.SetActive(locked);
            if (_selectedFrame  != null) _selectedFrame.SetActive(false);

            if (_selectButton != null)
            {
                _selectButton.interactable = !locked;
                _selectButton.onClick.RemoveAllListeners();
                _selectButton.onClick.AddListener(() => _onSelect?.Invoke());
            }
        }

        public void SetSelected(bool on)
        {
            if (_selectedFrame != null) _selectedFrame.SetActive(on);
        }
    }
}
