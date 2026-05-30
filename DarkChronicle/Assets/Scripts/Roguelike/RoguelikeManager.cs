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

        [Header("Save / Pause")]
        [SerializeField] AssetRegistry      _assetRegistry;
        [SerializeField] PauseMenuUI        _pauseMenu;

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

        // ── Equipment UI ───────────────────────────────────────────────────
        [Header("Equipment")]
        [SerializeField] UI.EquipMenuUI      _equipMenuUI;

        // ── State ──────────────────────────────────────────────────────────
        RunData     _run;
        MapData     _currentMapData;
        MapNode     _currentNode;
        FloorData   _currentFloor;
        bool        _waitingForNodeSelect;
        MapNode     _selectedNode;
        bool        _runEndInProgress;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake() => Instance = this;

        void Start() => StartCoroutine(MainFlow());

        // ── Main Flow ──────────────────────────────────────────────────────
        IEnumerator MainFlow()
        {
            if (RunSaveSystem.HasSave() && _assetRegistry != null)
            {
                var dto = RunSaveSystem.LoadDTO();
                if (dto != null)
                {
                    _run = RunSaveSystem.RestoreRunData(dto, _assetRegistry);
                    InitSubSystems();
                    yield return ResumeRun(dto);
                    yield break;
                }
            }

            yield return CharacterSelect();
            if (_run == null) yield break;

            InitSubSystems();
            yield return StartRun();
        }

        IEnumerator ResumeRun(RunSaveDTO dto)
        {
            yield return FadeGroup(_hud, 0f, 1f, 0.5f);

            int resumeFloor = dto.CurrentFloor;
            _currentFloor   = _floorLibrary.Get(resumeFloor);
            _currentMapData = NodeMapGenerator.Generate(_run.Seed, resumeFloor);

            var visited   = new System.Collections.Generic.HashSet<int>(dto.VisitedNodeIDs   ?? new int[0]);
            var available = new System.Collections.Generic.HashSet<int>(dto.AvailableNodeIDs ?? new int[0]);
            foreach (var node in _currentMapData.Nodes)
            {
                node.Visited   = visited.Contains(node.ID);
                node.Available = available.Contains(node.ID);
            }

            _currentNode = dto.CurrentNodeID >= 0
                ? _currentMapData.GetNode(dto.CurrentNodeID)
                : null;

            if (!_currentMapData.Nodes.Exists(n => n.Available))
            {
                foreach (var n in _currentMapData.GetStartNodes()) n.Available = true;
            }

            AtmosphereManager.Instance?.TransitionTo(_currentFloor.AtmospherePreset, 2f);
            AudioManager.Instance?.PlayBGM(_currentFloor.FloorBGM);
            yield return SceneTransitionManager.Instance?.ShowAreaTitle(
                _currentFloor.FloorName, "（再開）");

            yield return FloorLoop(resumeFloor);
            if (!_run.IsRunActive) yield break;

            if (_run.HasRelic(RelicEffectType.FloorClearHeal))
                _run.HealHP(_relicManager.ModifyHealAmount(Mathf.RoundToInt(_run.MaxHP * 0.3f)));
            yield return ShowFloorClearScreen(resumeFloor);

            for (_run.CurrentFloor = resumeFloor + 1;
                 _run.CurrentFloor < _floorLibrary.Floors.Count;
                 _run.CurrentFloor++)
            {
                _currentFloor = _floorLibrary.Get(_run.CurrentFloor);
                yield return StartFloor(_run.CurrentFloor);
                if (!_run.IsRunActive) yield break;

                if (_run.HasRelic(RelicEffectType.FloorClearHeal))
                    _run.HealHP(_relicManager.ModifyHealAmount(Mathf.RoundToInt(_run.MaxHP * 0.3f)));
                yield return ShowFloorClearScreen(_run.CurrentFloor);
            }

            if (_run.ActiveEnding != EndingType.None && _run.IsRunActive)
            {
                _currentFloor = EndingSystem.CreateFloor4(_run.ActiveEnding);
                _run.CurrentFloor = 3;
                yield return StartFloor4();
                if (!_run.IsRunActive) yield break;
                if (_endingManager != null)
                    yield return _endingManager.ShowEnding(_run.ActiveEnding);
            }

            yield return RunVictory();
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
            RunHUDController.Instance?.InitForRun(_run);
            DeckViewPanel.Instance?.InitForRun(_run);

            if (_pauseMenu != null)
            {
                _pauseMenu.OnSaveRequested     += () => RunSaveSystem.Save(_run, _currentMapData,
                                                                           _currentNode?.ID ?? -1);
                _pauseMenu.OnAbandonConfirmed  += () => StartCoroutine(AbandonRun());
                _pauseMenu.OnMainMenuConfirmed += () =>
                    UnityEngine.SceneManagement.SceneManager.LoadScene("MainMenu");
                _pauseMenu.OnEquipRequested    += () =>
                {
                    if (_equipMenuUI != null) StartCoroutine(_equipMenuUI.Open(_run));
                };
            }

            BattleManager.OnBattleEnd         += OnBattleEnd;
            BattleManager.OnDamageDealt       += (c, d) => { if (!c.IsPlayer) _run.DamageDealt += d; };
            BattleManager.OnCharacterDefeated += c =>       { if (c.IsPlayer)  CheckDeath(); };
            World.EventTrigger.OnItemPickedUp += OnItemPickedUpInField;
        }

        void OnItemPickedUpInField(Data.ItemData item, int qty)
        {
            if (item == null || _run == null) return;
            for (int i = 0; i < qty; i++) _run.Inventory.Add(item);
        }

        void OnDestroy()
        {
            BattleManager.OnBattleEnd -= OnBattleEnd;
            World.EventTrigger.OnItemPickedUp -= OnItemPickedUpInField;
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

                // Checkpoint save after every non-boss room
                if (_currentNode.Type != NodeType.Boss)
                    RunSaveSystem.Save(_run, _currentMapData, _currentNode.ID);

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

            BattleManager.Instance.StartBattle(heroDataList, heroStatList, enemies,
                new List<ItemData>(_run.Inventory),
                usedItem => _run.Inventory.Remove(usedItem));

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
                var drops = ProcessDropTable(defeatedEnemies);
                if (drops.Count > 0)
                {
                    foreach (var (item, qty) in drops)
                        for (int i = 0; i < qty; i++) _run.Inventory.Add(item);
                    yield return _lootSystem.ShowDropItems(drops);
                }

                var endingBefore = _run.ActiveEnding;
                yield return _lootSystem.ShowBattleRewards(goldReward, isElite, isBoss);
                if (_run.ActiveEnding != endingBefore && _endingManager != null)
                    yield return _endingManager.ShowPremonition(_run.ActiveEnding);
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
            // 35% chance: equipment drop (scales with floor)
            if (Random.value < 0.35f + _run.CurrentFloor * 0.05f)
            {
                var equip = EquipmentFactory.DrawForFloor(_run.CurrentFloor);
                if (equip != null)
                {
                    _run.EquipmentInventory.Add(equip);
                    yield return _lootSystem.ShowEquipmentObtained(equip);
                    yield break;
                }
            }

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
                yield return ObtainRelic(relic);
            else
            {
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
                if (relic.AttachedCurse != null) _run.AddCurse(relic.AttachedCurse);
                yield return ObtainRelic(relic);
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
            if (_currentFloor == null) return;

            float hpMult  = _currentFloor.EnemyHPMultiplier;
            float dmgMult = isBoss  ? _currentFloor.BossDamageMultiplier
                                    : _currentFloor.EnemyDamageMultiplier;
            int   hpBonus = isBoss  ? _currentFloor.BossHPBonus : 0;
            int   shBonus = isBoss  ? _currentFloor.BossShieldBonus
                          : isElite ? _currentFloor.AdditionalShieldsOnElite : 0;

            for (int i = 0; i < enemies.Count; i++)
            {
                var src = enemies[i];
                if (src == null) continue;

                var scaled = ScriptableObject.CreateInstance<EnemyData>();
                scaled.EnemyName         = src.EnemyName;
                scaled.Lore              = src.Lore;
                scaled.BattleSprite      = src.BattleSprite;
                scaled.Rank              = src.Rank;
                scaled.IsUndead          = src.IsUndead;
                scaled.ElementWeaknesses = src.ElementWeaknesses != null
                    ? new List<ElementType>(src.ElementWeaknesses)
                    : new List<ElementType>();
                scaled.Actions           = src.Actions;
                scaled.ActionsPerTurn    = src.ActionsPerTurn;
                scaled.DropTable         = src.DropTable;
                scaled.ExpReward         = src.ExpReward;
                scaled.JPReward          = src.JPReward;
                scaled.GoldReward        = src.GoldReward;

                var s = src.Stats.Clone();
                s.MaxHP          = Mathf.RoundToInt(s.MaxHP         * hpMult)  + hpBonus;
                s.PhysicalAttack = Mathf.RoundToInt(s.PhysicalAttack * dmgMult);
                s.MagicAttack    = Mathf.RoundToInt(s.MagicAttack    * dmgMult);
                scaled.Stats        = s;
                scaled.ShieldPoints = Mathf.Max(1, src.ShieldPoints + shBonus);

                enemies[i] = scaled;
            }
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

            // Apply equipment bonuses
            var eq = _run.EquipmentBonusStats;
            base_.MaxHP           += eq.MaxHP;
            base_.MaxMP           += eq.MaxMP;
            base_.PhysicalAttack  += eq.PhysicalAttack;
            base_.MagicAttack     += eq.MagicAttack;
            base_.PhysicalDefense += eq.PhysicalDefense;
            base_.MagicDefense    += eq.MagicDefense;
            base_.Speed           += eq.Speed;
            base_.Luck            += eq.Luck;
            base_.CriticalRate    += eq.CriticalRate;
            base_.AccuracyRate    += eq.AccuracyRate;

            // VampiricBlade: -20% MaxHP
            if (_run.HasRelic(RelicEffectType.VampiricBlade))
                base_.MaxHP = Mathf.RoundToInt(base_.MaxHP * 0.8f);

            // MirrorCurse: -10% MaxHP per curse held
            float mirrorCursePenalty = _relicManager.GetMirrorCurseHPPenalty();
            if (mirrorCursePenalty > 0f)
                base_.MaxHP = Mathf.RoundToInt(base_.MaxHP * (1f - mirrorCursePenalty));

            return base_;
        }

        // ── Drop Table Processing ─────────────────────────────────────────
        List<(Data.ItemData item, int qty)> ProcessDropTable(List<EnemyData> enemies)
        {
            var result = new List<(Data.ItemData, int)>();
            foreach (var enemy in enemies)
            {
                if (enemy?.DropTable == null) continue;
                foreach (var drop in enemy.DropTable)
                {
                    if (drop?.Item == null) continue;
                    float rate = drop.DropRate;
                    if (_run.HasRelic(Relics.RelicEffectType.LuckUp)) rate = Mathf.Min(1f, rate * 1.5f);
                    if (Random.value <= rate)
                        result.Add((drop.Item, Mathf.Max(1, drop.Quantity)));
                }
            }
            return result;
        }

        // ── Relic Acquisition (with ending-path premonition check) ────────
        IEnumerator ObtainRelic(RelicData relic)
        {
            if (relic == null) yield break;
            bool endingWasUnset = _run.ActiveEnding == EndingType.None;
            _run.AddRelic(relic);                               // may auto-set ActiveEnding
            yield return _lootSystem.ShowRelicObtained(relic);
            if (endingWasUnset && _run.ActiveEnding != EndingType.None && _endingManager != null)
                yield return _endingManager.ShowPremonition(_run.ActiveEnding);
        }

        // ── Soul Siphon Reward ─────────────────────────────────────────────
        public void TriggerSoulSiphonReward()
        {
            var relic = _lootSystem.DrawRelic(RelicRarity.Rare, true);
            if (relic != null)
                StartCoroutine(ObtainRelic(relic));
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

        public static CurseData BuildCurse(CurseEffectType effect)
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

        public IEnumerator ShowSkillUpgradeSelection(System.Action<bool> onDone = null)
        {
            bool upgraded = false;
            yield return _lootSystem.ShowPickFromDeck(
                "スキルを強化",
                SkillUpgradeSystem.CanUpgrade,
                skill => { SkillUpgradeSystem.UpgradeInDeck(_run, skill); upgraded = true; });
            onDone?.Invoke(upgraded);
        }

        public IEnumerator ShowRelicSmeltSelection(System.Action<bool> onDone = null)
        {
            bool smelted = false;
            yield return _lootSystem.ShowPickFromRelics(
                "レリックを溶錬（MaxHP +15%）",
                null,
                relic =>
                {
                    _run.Relics.Remove(relic);
                    int increase = Mathf.RoundToInt(_run.MaxHP * 0.15f);
                    _run.MaxHP  += increase;
                    _run.HealHP(increase);
                    smelted = true;
                });
            onDone?.Invoke(smelted);
        }

        // ── Death / Victory ────────────────────────────────────────────────
        void CheckDeath()
        {
            if (!_run.IsAlive) StartCoroutine(RunDeath());
        }

        IEnumerator RunDeath()
        {
            if (_runEndInProgress) yield break;
            _runEndInProgress = true;
            _run.IsRunActive  = false;
            RunSaveSystem.DeleteSave();
            AudioManager.Instance?.StopBGM();
            yield return new WaitForSeconds(1.5f);
            _runSummaryText.text = BuildSummary(won: false);
            yield return FadeGroup(_deathPanel, 0f, 1f, 1f);
            SetupEndButtons();
        }

        IEnumerator RunVictory()
        {
            if (_runEndInProgress) yield break;
            _runEndInProgress = true;
            _run.IsRunActive  = false;
            RunSaveSystem.DeleteSave();
            yield return new WaitForSeconds(1f);
            _runSummaryText.text = BuildSummary(won: true);
            yield return FadeGroup(_victoryPanel, 0f, 1f, 1f);
            SetupEndButtons();
        }

        IEnumerator AbandonRun()
        {
            RunSaveSystem.DeleteSave();
            yield return RunDeath();
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
