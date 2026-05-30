using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DarkChronicle.Data;
using DarkChronicle.Roguelike.Relics;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// ScriptableObject 名 → インスタンス のルックアップ。
    /// RunSaveSystem のロード時にセーブデータの名前文字列から実アセットを復元する。
    /// すべてのゲームアセットをインスペクタで登録しておくこと。
    /// </summary>
    public sealed class AssetRegistry : MonoBehaviour
    {
        public static AssetRegistry Instance { get; private set; }

        [Header("Characters")]
        [SerializeField] List<CharacterData> _characters;

        [Header("Skills (all, including upgraded variants)")]
        [SerializeField] List<SkillData>     _allSkills;

        [Header("Relics")]
        [SerializeField] List<RelicData>     _allRelics;

        [Header("Items")]
        [SerializeField] List<ItemData>      _allItems;

        Dictionary<string, CharacterData> _charMap  = new();
        Dictionary<string, SkillData>     _skillMap = new();
        Dictionary<string, RelicData>     _relicMap = new();
        Dictionary<string, ItemData>      _itemMap  = new();

        void Awake()
        {
            Instance  = this;
            _charMap  = (_characters ?? new()).Where(x => x).ToDictionary(x => x.name);
            _skillMap = (_allSkills  ?? new()).Where(x => x).ToDictionary(x => x.name);
            _relicMap = (_allRelics  ?? new()).Where(x => x).ToDictionary(x => x.name);
            _itemMap  = (_allItems   ?? new()).Where(x => x).ToDictionary(x => x.name);
        }

        public CharacterData FindCharacter(string n) => _charMap.TryGetValue(n,  out var v) ? v : null;
        public SkillData     FindSkill(string n)     => _skillMap.TryGetValue(n, out var v) ? v : null;
        public RelicData     FindRelic(string n)     => _relicMap.TryGetValue(n, out var v) ? v : null;
        public ItemData      FindItem(string n)      => _itemMap.TryGetValue(n,  out var v) ? v : ItemFactory.Get(n);
    }
}
