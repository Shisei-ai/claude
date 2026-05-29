using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Battle;
using DarkChronicle.Core;
using DarkChronicle.Data;
using DarkChronicle.HD2D;
using DarkChronicle.Roguelike.Events;
using DarkChronicle.Roguelike.Map;
using DarkChronicle.Roguelike.Relics;
using DarkChronicle.UI;

namespace DarkChronicle.Roguelike
{
    /// <summary>
    /// Top-level controller for the roguelike run.
    /// Orchestrates: character select → map → node resolution → repeat until win/death.
    /// Acts as the glue between all roguelike sub-systems.
    /// </summary>
    public sealed class RoguelikeManager : MonoBehaviour
    {
        public static RoguelikeManager Instance { get; private set; }

        // ── Sub-system References ──────────────────────────────────────────
        [Header("Sub-systems")]
        [SerializeField] RelicManager        _relicManager;
        [SerializeField] LootSystem          _lootSystem;
        [SerializeField] RandomEventManager  _eventManager;
        [SerializeField] ShopController      _shopController;
        [SerializeField] RestSiteController  _restSiteController;
        [SerializeField] NodeMapUI           _mapUI;

        // ── Floor Config ───────────────────────────────────────────────────
        [Header("Floor Config")]
        [SerializeField] FloorLibrary        _floorLibrary;

        // ── Character Select UI ────────────────────────────────────────────
        [Header("Character Select")]
        [SerializeField] CanvasGroup         _charSelectPanel;
        [SerializeField] Transform           _charCardContainer;
        [SerializeField] GameObject          _charCardPrefab;
        [SerializeField] List<CharacterData> _playableCharacters;

        // ── HUD ────────────────────────────────────────────────────────────
        [Header("Run HUD")]
        [SerializeField] CanvasGroup         _hud;
        [SerializeField] TextMeshProUGUI     _floorLabel;
        [SerializeField] Slider              _hpSlider;
        [SerializeField] TextMeshProUGUI     _hpText;
        [SerializeField] TextMeshProUGUI     _goldText;
        [SerializeField] TextMeshProUGUI     _luckText;
        [SerializeField] Transform           _relicBarRoot;
        [SerializeField] GameObject          _relicIconPrefab;
        [SerializeField] Transform           _curseBarRoot;
        [SerializeField] GameObject          _curseIconPrefab;

        // ── Run End ────────────────────────────────────────────────────────
        [Header("Run End")]
        [SerializeField] CanvasGroup         _victoryPanel;
        [SerializeField] CanvasGroup         _deathPanel;
        [SerializeField] TextMeshProUGUI     _runSummaryText;
        [SerializeField] Button              _restartButton;
        [SerializeField] Button              _menuButton;

        // ── Skill / Relic Pick UIs (reused) ───────────────────────────────
        [Header("Selection UIs")]
        [SerializeField] CanvasGroup         _skillUpgradeUI;
        [SerializeField] CanvasGroup         _relicSmeltUI;

        // ── Level Up UI ────────────────────────────────────────────────────
        [Header("Level Up")]
        [SerializeField] LevelUpUI           _levelUpUI;

        // ── Ending ─────────────────────────────────────────────────────────
        [Header("Ending")]
        [SerializeField] EndingManager       _endingManager;

        // ── State ──────────────────────────────────────────────────────────
        RunData     _run;
        MapData     _currentMapData;
        MapNode     _currentNode;
        FloorData   _currentFloor;
        bool        _waitingForNodeSelect;
        MapNode     _selectedNode;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake() => Instance = this;

        void Start() => StartCoroutine(MainFlow());

        // ── Main Flow ──────────────────────────────────────────────────────
        IEnumerator MainFlow()
        {
            yield return CharacterSelect();
            if (_run == null) yield break;

            InitSubSystems();
            yield return StartRun();
        }

        // ── Character Select ───────────────────────────────────────────────
        IEnumerator CharacterSelect()
        {
            CharacterData chosen = null;

            foreach (Transform child in _charCardContainer) Destroy(child.gameObject);

            foreach (var cd in _playableCharacters)
            {
                var go   = Instantiate(_charCardPrefab, _charCardContainer);
                var card = go.GetComponent<CharacterSelectCard>() ?? go.AddComponent<CharacterSelectCard>();
                card.Setup(cd, () => { chosen = cd; });
            }

            yield return FadeGroup(_charSelectPanel, 0f, 1f, 0.5f);
            while (chosen == null) yield return null;
            yield return FadeGroup(_charSelectPanel, 1f, 0f, 0.4f);

            _run = new RunData
            {
                SelectedCharacter = chosen,
                Seed              = Random.Range(0, int.MaxValue),
                StartTime         = System.DateTime.Now,
                MaxHP             = chosen.BaseStats.MaxHP,
                CurrentHP         = chosen.BaseStats.MaxHP,
                IsRunActive       = true,
            };

            // Starting relic: one common relic
            var startRelic = _lootSystem.DrawRelic(RelicRarity.Common, false);
            if (startRelic != null) _run.AddRelic(startRelic);

            // Starting deck: job-level-1 skills from the starter job
            LevelSystem.InitStartingSkills(_run, chosen.StarterJob);
        }

        void InitSubSystems()
        {
            _relicManager       .InitForRun(_run);
            _lootSystem         .InitForRun(_run);
            _eventManager       .InitForRun(_run);
            _shopController     .InitForRun(_run);
            _restSiteController .InitForRun(_run);

            BattleManager.OnBattleEnd       += OnBattleEnd;
            BattleManager.OnDamageDealt     += (c, d) => { if (!c.IsPlayer) _run.DamageDealt += d; };
            BattleManager.OnCharacterDefeated += c =>    { if (c.IsPlayer)  CheckDeath(); };
        }

        void OnDestroy()
        {
            BattleManager.OnBattleEnd -= OnBattleEnd;
        }

        // ── Run Loop ───────────────────────────────────────────────────────
        IEnumerator StartRun()
        {
            yield return FadeGroup(_hud, 0f, 1f, 0.5f);

            for (_run.CurrentFloor = 0; _run.CurrentFloor < _floorLibrary.Floors.Count; _run.CurrentFloor++)
            {
                _currentFloor = _floorLibrary.Get(_run.CurrentFloor);
                yield return StartFloor(_run.CurrentFloor);
                if (!_run.IsRunActive) yield break;

                // Floor clear heal (if relic present)
                if (_run.HasRelic(RelicEffectType.FloorClearHeal))
                {
                    int healAmt = Mathf.RoundToInt(_run.MaxHP * 0.3f);
                    _run.HealHP(_relicManager.ModifyHealAmount(healAmt));
                }

                yield return ShowFloorClearScreen(_run.CurrentFloor);
            }

            // Floor 4: ending branch if player acquired an ending relic
            if (_run.ActiveEnding != EndingType.None && _run.IsRunActive)
            {
                _currentFloor = EndingSystem.CreateFloor4(_run.ActiveEnding);
                _run.CurrentFloor = 3;
                yield return StartFloor4();
                if (!_run.IsRunActive) yield break;

                if (_endingManager != null)
                    yield return _endingManager.ShowEnding(_run.ActiveEnding);
            }

            // All floors cleared = victory
            yield return RunVictory();
        }

        IEnumerator StartFloor(int floorIndex)
        {
            _currentFloor   = _floorLibrary.Get(floorIndex);
            _currentMapData = NodeMapGenerator.Generate(_run.Seed, floorIndex);

            // Set atmosphere
            AtmosphereManager.Instance?.TransitionTo(_currentFloor.AtmospherePreset, 2f);
            AudioManager.Instance?.PlayBGM(_currentFloor.FloorBGM);

            // Show floor title
            yield return SceneTransitionManager.Instance.ShowAreaTitle(
                _currentFloor.FloorName, _currentFloor.FloorSubtitle);

            // Pick starting node
            var startNodes = _currentMapData.GetStartNodes();
            foreach (var n in startNodes) n.Available = true;

            yield return FloorLoop(floorIndex);
        }

        IEnumerator StartFloor4()
        {
            // _currentFloor is already set to the dynamically created Floor4 data
            _currentMapData = NodeMapGenerator.Generate(_run.Seed + 9973, 3);

            AtmosphereManager.Instance?.TransitionTo(_currentFloor.AtmospherePreset, 2f);
            AudioManager.Instance?.PlayBGM(_currentFloor.BossBGM);

            yield return SceneTransitionManager.Instance?.ShowAreaTitle(
                _currentFloor.FloorName, _currentFloor.FloorSubtitle);

            var startNodes = _currentMapData.GetStartNodes();
            foreach (var n in startNodes) n.Available = true;

            yield return FloorLoop(3);
        }

        IEnumerator FloorLoop(int floorIndex)
        {
            while (true)
            {
                RefreshHUD();

                // Show map and wait for node selection
                _selectedNode = null;
                _mapUI.BuildMap(_currentMapData,
                                _currentNode?.ID ?? -1,
                                node => _selectedNode = node);

                yield return FadeGroup(_mapUI.GetComponent<CanvasGroup>(), 0f, 1f, 0.3f);
                while (_selectedNode == null) yield return null;
                yield return FadeGroup(_mapUI.GetComponent<CanvasGroup>(), 1f, 0f, 0.25f);

                _currentNode = _selectedNode;
                _currentNode.Visited = true;
                _run.CurrentNodeIndex++;
                _run.TotalRoomsCleared++;

                // AncientCurse: lose HP each room
                if (_run.Curses.Exists(c => c.Effect == CurseEffectType.ReduceMaxHP))
                    _run.TakeDamage(Mathf.RoundToInt(_run.MaxHP * 0.05f));

                yield return ResolveNode(_currentNode, floorIndex);
                if (!_run.IsRunActive) yield break;

                // Did we reach the boss and beat it?
                if (_currentNode.Type == NodeType.Boss) yield break;

                // Mark next nodes as available
                foreach (int nextID in _currentNode.NextIDs)
                {
                    var next = _currentMapData.GetNode(nextID);
                    if (next != null) next.Available = true;
                }
            }
        }

        // ── Node Resolution ────────────────────────────────────────────────
        IEnumerator ResolveNode(MapNode node, int floorIndex)
        {
            _run.LastNodeType = node.Type;

            yield return node.Type switch
            {
                NodeType.Battle      => ResolveBattle(false, false),
                NodeType.EliteBattle => ResolveBattle(true,  false),
                NodeType.Boss        => ResolveBattle(false, true),
                NodeType.Shop        => _shopController.OpenShop(),
                NodeType.RestSite    => _restSiteController.OpenRestSite(),
                NodeType.RandomEvent => ResolveEvent(floorIndex),
                NodeType.Treasure    => ResolveTreasure(),
                NodeType.CursedRoom  => ResolveCursedRoom(),
                _                    => null
            };
        }

        // ── Battle ─────────────────────────────────────────────────────────
        IEnumerator ResolveBattle(bool isElite, bool isBoss)
        {
            var enemies = SelectEncounterGroup(isElite, isBoss);
            if (enemies == null) yield break;

            // Apply floor scaling
            ScaleEnemies(enemies, isElite, isBoss);

            if (isBoss) AudioManager.Instance?.PlayBGM(_currentFloor.BossBGM);

            AtmosphereManager.Instance?.EnterBattle();

            // Trigger battle
            var heroDataList = new List<CharacterData> { _run.SelectedCharacter };
            var heroStatList = new List<CharacterStats>
            {
                BuildCurrentHeroStats()
            };

            _relicManager.OnBattleStart(
                new List<BattleCharacter>(), // battle characters built inside BattleManager
                new List<BattleCharacter>()
            );

            BattleManager.Instance.StartBattle(heroDataList, heroStatList, enemies);

            // Wait for battle to finish
            bool battleDone = false;
            BattleResult lastResult = BattleResult.Defeat;
            System.Action<BattleResult> onEnd = r => { lastResult = r; battleDone = true; };
            BattleManager.OnBattleEnd += onEnd;
            while (!battleDone) yield return null;
            BattleManager.OnBattleEnd -= onEnd;

            if (lastResult == BattleResult.Victory)
            {
                // EXP / JP rewards from defeated enemies
                var defeatedEnemies = BattleManager.Instance.VictoryEnemyData;
                var (totalExp, totalJP) = LevelSystem.ComputeBattleRewards(defeatedEnemies);
                _run.EnemiesKilled += defeatedEnemies.Count;

                var levelsGained = LevelSystem.AddExp(_run, totalExp, out var statDelta);
                var skillsUnlocked = LevelSystem.AddJP(_run, _run.SelectedCharacter.StarterJob, totalJP);

                if ((levelsGained.Count > 0 || skillsUnlocked.Count > 0) && _levelUpUI != null)
                    yield return _levelUpUI.Show(levelsGained, statDelta, skillsUnlocked);

                int goldReward = _currentFloor.BaseGoldReward + Random.Range(-10, 20);
                if (isElite && _relicManager.HasEliteHunter()) goldReward *= 2;
                yield return _lootSystem.ShowBattleRewards(goldReward, isElite, isBoss);
            }
            else if (lastResult == BattleResult.Defeat)
            {
                yield return RunDeath();
            }

            AtmosphereManager.Instance?.ExitBattle();
            AudioManager.Instance?.PlayBGM(_currentFloor.FloorBGM);
        }

        void OnBattleEnd(BattleResult result)
        {
            // HP is synced from BattleCharacter back to RunData after battle
            // (handled in the coroutine above)
        }

        // ── Event ──────────────────────────────────────────────────────────
        IEnumerator ResolveEvent(int floorIndex)
        {
            var ev = _eventManager.SelectEvent(floorIndex, _run.Sanity);
            yield return _eventManager.RunEvent(ev);
        }

        // ── Treasure ───────────────────────────────────────────────────────
        IEnumerator ResolveTreasure()
        {
            // Sanity-weighted: higher sanity = better relic rarity
            float roll = Random.value - _run.Sanity * 0.08f;
            RelicRarity rarity = roll < 0.15f ? RelicRarity.Rare :
                                 roll < 0.45f ? RelicRarity.Uncommon :
                                                RelicRarity.Common;

            // TreasureNose: bump rarity by one tier
            if (_relicManager.HasTreasureNose())
                rarity = rarity == RelicRarity.Common   ? RelicRarity.Uncommon :
                         rarity == RelicRarity.Uncommon ? RelicRarity.Rare :
                                                          RelicRarity.Rare;

            var relic = _lootSystem.DrawRelic(rarity, false);
            if (relic != null)
            {
                _run.AddRelic(relic);
                yield return _lootSystem.ShowRelicObtained(relic);
            }
            else
            {
                // Fallback: gold
                int gold = Mathf.RoundToInt(Random.Range(60f, 120f) * (1f + _run.Sanity * 0.05f));
                _run.EarnGold(gold);
            }
        }

        // ── Cursed Room ────────────────────────────────────────────────────
        IEnumerator ResolveCursedRoom()
        {
            // High-risk, high-reward: take 15% max HP damage, get a Rare relic
            int damage = Mathf.RoundToInt(_run.MaxHP * 0.15f);
            _run.TakeDamage(damage);

            // RiskRewardMaster relic doubles the reward
            RelicRarity rarity = _run.HasRelic(RelicEffectType.RiskRewardMaster)
                ? RelicRarity.Boss : RelicRarity.Rare;

            var relic = _lootSystem.DrawRelic(rarity, false);
            if (relic != null)
            {
                _run.AddRelic(relic);
                if (relic.AttachedCurse != null) _run.AddCurse(relic.AttachedCurse);
                yield return _lootSystem.ShowRelicObtained(relic);
            }

            if (!_run.IsAlive) yield return RunDeath();
        }

        // ── Enemy Selection ────────────────────────────────────────────────
        List<EnemyData> SelectEncounterGroup(bool isElite, bool isBoss)
        {
            if (isBoss)
            {
                if (_currentFloor.BossPool.Count == 0) return null;
                return new List<EnemyData> { _currentFloor.BossPool[
                    Random.Range(0, _currentFloor.BossPool.Count)] };
            }

            var pool  = isElite ? _currentFloor.EliteEncounters : _currentFloor.NormalEncounters;
            float total = pool.Sum(g => g.AdjustedWeight(_run.Sanity));
            float roll  = Random.Range(0f, total);
            float cum   = 0f;

            foreach (var group in pool)
            {
                cum += group.AdjustedWeight(_run.Sanity);
                if (roll < cum) return new List<EnemyData>(group.Enemies);
            }
            return pool.Count > 0 ? new List<EnemyData>(pool[0].Enemies) : null;
        }

        void ScaleEnemies(List<EnemyData> enemies, bool isElite, bool isBoss)
        {
            // Create scaled clones at runtime (don't modify the ScriptableObjects)
            // Actual scaling happens inside BattleManager initialization; pass multipliers via event.
        }

        CharacterStats BuildCurrentHeroStats()
        {
            var base_ = _run.SelectedCharacter.BaseStats.Clone();
            var growth = LevelSystem.GetAccumulatedStatGrowth(
                _run.SelectedCharacter, _run.CharacterLevel);

            // Add level growth to all non-HP stats (HP is tracked live via run.MaxHP)
            base_.MaxMP           += growth.MaxMP;
            base_.PhysicalAttack  += growth.PhysicalAttack;
            base_.MagicAttack     += growth.MagicAttack;
            base_.PhysicalDefense += growth.PhysicalDefense;
            base_.MagicDefense    += growth.MagicDefense;
            base_.Speed           += growth.Speed;
            base_.Luck            += growth.Luck;
            base_.CriticalRate    += growth.CriticalRate;

            // HP is always sourced from the run's tracked MaxHP (affected by events/relics)
            base_.MaxHP = _run.MaxHP;

            // VampiricBlade: -20% MaxHP
            if (_run.HasRelic(RelicEffectType.VampiricBlade))
                base_.MaxHP = Mathf.RoundToInt(base_.MaxHP * 0.8f);

            // MirrorCurse: -10% MaxHP per curse held
            float mirrorCursePenalty = _relicManager.GetMirrorCurseHPPenalty();
            if (mirrorCursePenalty > 0f)
                base_.MaxHP = Mathf.RoundToInt(base_.MaxHP * (1f - mirrorCursePenalty));

            return base_;
        }

        // ── Soul Siphon Reward ─────────────────────────────────────────────
        public void TriggerSoulSiphonReward()
        {
            var relic = _lootSystem.DrawRelic(RelicRarity.Rare, true);
            if (relic != null)
            {
                _run.AddRelic(relic);
                StartCoroutine(_lootSystem.ShowRelicObtained(relic));
            }
        }

        // ── Public Delegation (called by sub-systems) ──────────────────────
        public RelicData DrawRelic(RelicRarity rarity, bool forEvent) =>
            _lootSystem.DrawRelic(rarity, forEvent);

        public IEnumerator ShowRelicObtained(RelicData relic) =>
            _lootSystem.ShowRelicObtained(relic);

        public IEnumerator ShowSkillDraft(int count) =>
            _lootSystem.ShowSkillDraft(count);

        public IEnumerator ShowSkillRemove() =>
            _lootSystem.ShowSkillRemove();

        public IEnumerator TriggerEventBattle(bool isElite) =>
            ResolveBattle(isElite, false);

        public CurseData DrawRandomCurse()
        {
            // Draw a random curse type, excluding ones already active in this run
            var existing = _run?.Curses.Select(c => c.Effect).ToHashSet()
                          ?? new System.Collections.Generic.HashSet<CurseEffectType>();

            var available = System.Enum.GetValues(typeof(CurseEffectType))
                .Cast<CurseEffectType>()
                .Where(t => !existing.Contains(t))
                .ToList();

            if (available.Count == 0) return null;

            var chosen = available[Random.Range(0, available.Count)];
            return BuildCurse(chosen);
        }

        static CurseData BuildCurse(CurseEffectType effect)
        {
            var c = ScriptableObject.CreateInstance<CurseData>();
            (c.CurseName, c.Description, c.Magnitude) = effect switch
            {
                CurseEffectType.ReduceMaxHP         => ("衰弱",     "最大HPが20減少する。",             20f),
                CurseEffectType.DoubleEncounterRate  => ("魔物の気配","エンカウント率が2倍になる。",        2f),
                CurseEffectType.GoldReduced          => ("貧困の呪い","獲得ゴールドが50%減少する。",        0.5f),
                CurseEffectType.SkillCostUp          => ("魔力の枷",  "全スキルのMP消費が+1される。",       1f),
                CurseEffectType.WeakenedHeal         => ("汚染の傷",  "回復量が半減する。",                0.5f),
                CurseEffectType.BleedAtStart         => ("血の呪縛",  "戦闘開始時に出血状態になる。",       1f),
                CurseEffectType.ShieldBreakChanceDown=> ("鈍き刃",    "シールド破壊確率が20%低下する。",    0.2f),
                CurseEffectType.SanityDown           => ("精神の亀裂", "SANITYが1低下し続ける。",            1f),
                CurseEffectType.FragileHP             => ("脆弱の体",  "受けるダメージが10%増加する。",      0.1f),
                CurseEffectType.NoBP                 => ("力の封印",  "BP を回収できなくなる。",           1f),
                _                                    => ("未知の呪い","不明な呪いにかかっている。",         1f),
            };
            c.Effect = effect;
            return c;
        }

        public IEnumerator ShowSkillUpgradeSelection()
        {
            yield return _lootSystem.ShowPickFromDeck(
                "スキルを強化",
                SkillUpgradeSystem.CanUpgrade,
                skill => SkillUpgradeSystem.UpgradeInDeck(_run, skill));
        }

        public IEnumerator ShowRelicSmeltSelection()
        {
            yield return _lootSystem.ShowPickFromRelics(
                "レリックを溶錬（MaxHP +15%）",
                null,
                relic =>
                {
                    _run.Relics.Remove(relic);
                    int increase = Mathf.RoundToInt(_run.MaxHP * 0.15f);
                    _run.MaxHP  += increase;
                    _run.HealHP(increase);
                });
        }

        // ── Death / Victory ────────────────────────────────────────────────
        void CheckDeath()
        {
            if (!_run.IsAlive) StartCoroutine(RunDeath());
        }

        IEnumerator RunDeath()
        {
            _run.IsRunActive = false;
            AudioManager.Instance?.StopBGM();
            yield return new WaitForSeconds(1.5f);
            _runSummaryText.text = BuildSummary(won: false);
            yield return FadeGroup(_deathPanel, 0f, 1f, 1f);
            SetupEndButtons();
        }

        IEnumerator RunVictory()
        {
            _run.IsRunActive = false;
            yield return new WaitForSeconds(1f);
            _runSummaryText.text = BuildSummary(won: true);
            yield return FadeGroup(_victoryPanel, 0f, 1f, 1f);
            SetupEndButtons();
        }

        void SetupEndButtons()
        {
            _restartButton.onClick.RemoveAllListeners();
            _restartButton.onClick.AddListener(() => UnityEngine.SceneManagement.SceneManager.LoadScene(
                UnityEngine.SceneManagement.SceneManager.GetActiveScene().name));

            _menuButton.onClick.RemoveAllListeners();
            _menuButton.onClick.AddListener(() =>
                UnityEngine.SceneManagement.SceneManager.LoadScene("MainMenu"));
        }

        static string SanityLabel(int sanity)
        {
            string sign = sanity >= 0 ? "+" : string.Empty;
            return $"精神 {sign}{sanity}";
        }

        string BuildSummary(bool won)
        {
            System.TimeSpan elapsed = System.DateTime.Now - _run.StartTime;
            return $"{(won ? "クリア！" : "力尽きた…")}\n" +
                   $"到達フロア: {_run.CurrentFloor + 1}\n" +
                   $"キャラクターLv: {_run.CharacterLevel}  累計EXP: {_run.TotalExpGained}\n" +
                   $"ジョブLv: {_run.JobLevel}  累計JP: {_run.TotalJPGained}\n" +
                   $"部屋数: {_run.TotalRoomsCleared}\n" +
                   $"撃破数: {_run.EnemiesKilled}\n" +
                   $"ダメージ: {_run.DamageDealt}\n" +
                   $"入手ゴールド: {_run.GoldEarned}\n" +
                   $"レリック数: {_run.RelicsFound}\n" +
                   $"プレイ時間: {(int)elapsed.TotalMinutes}分{elapsed.Seconds:D2}秒";
        }

        // ── HUD ────────────────────────────────────────────────────────────
        void RefreshHUD()
        {
            if (_floorLabel) _floorLabel.text = $"Floor {_run.CurrentFloor + 1}";
            if (_hpSlider)   _hpSlider.value   = _run.HPRatio;
            if (_hpText)     _hpText.text       = $"{_run.CurrentHP}/{_run.MaxHP}";
            if (_goldText)   _goldText.text      = $"{_run.Gold} G";
            if (_luckText)   _luckText.text      = SanityLabel(_run.Sanity);

            RefreshRelicBar();
        }

        void RefreshRelicBar()
        {
            foreach (Transform child in _relicBarRoot) Destroy(child.gameObject);
            foreach (var relic in _run.Relics)
            {
                var go  = Instantiate(_relicIconPrefab, _relicBarRoot);
                var img = go.GetComponent<Image>();
                if (img && relic.Icon) img.sprite = relic.Icon;
                var tip = go.GetComponent<TooltipTrigger>() ?? go.AddComponent<TooltipTrigger>();
                tip.SetText(relic.RelicName, relic.Description);
            }

            foreach (Transform child in _curseBarRoot) Destroy(child.gameObject);
            foreach (var curse in _run.Curses)
            {
                var go  = Instantiate(_curseIconPrefab, _curseBarRoot);
                var tip = go.GetComponent<TooltipTrigger>() ?? go.AddComponent<TooltipTrigger>();
                tip.SetText(curse.CurseName, curse.Description);
            }
        }

        IEnumerator ShowFloorClearScreen(int floor)
        {
            yield return SceneTransitionManager.Instance?.ShowAreaTitle(
                $"Floor {floor + 1} クリア！",
                _floorLibrary.Get(floor + 1)?.FloorName ?? "最終フロアへ...");
        }

        IEnumerator FadeGroup(CanvasGroup group, float from, float to, float duration)
        {
            if (group == null) yield break;
            float elapsed = 0f;
            group.alpha = from;
            group.blocksRaycasts = to > 0.5f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                group.alpha = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha = to;
            group.blocksRaycasts = to > 0.5f;
        }
    }

    // ── Tooltip Trigger ────────────────────────────────────────────────────
    public sealed class TooltipTrigger : MonoBehaviour,
        UnityEngine.EventSystems.IPointerEnterHandler,
        UnityEngine.EventSystems.IPointerExitHandler
    {
        string _title, _body;
        public void SetText(string title, string body) { _title = title; _body = body; }
        public void OnPointerEnter(UnityEngine.EventSystems.PointerEventData e) {}
        public void OnPointerExit (UnityEngine.EventSystems.PointerEventData e) {}
    }

    // ── Character Select Card ──────────────────────────────────────────────
    public sealed class CharacterSelectCard : MonoBehaviour
    {
        [SerializeField] Image            _portrait;
        [SerializeField] TextMeshProUGUI  _nameText;
        [SerializeField] TextMeshProUGUI  _jobText;
        [SerializeField] Button           _selectButton;

        public void Setup(CharacterData data, System.Action onSelected)
        {
            if (_portrait && data.Portrait) _portrait.sprite = data.Portrait;
            if (_nameText)  _nameText.text = data.CharacterName;
            if (_jobText)   _jobText.text  = data.StarterJob?.JobName ?? string.Empty;
            _selectButton = GetComponent<Button>() ?? GetComponentInChildren<Button>();
            _selectButton?.onClick.AddListener(() => onSelected?.Invoke());
        }
    }
}
