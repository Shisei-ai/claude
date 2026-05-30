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

        // ── Difficulty Select UI ───────────────────────────────────────────
        [Header("Difficulty Select")]
        [SerializeField] CanvasGroup         _difficultyPanel;
        [SerializeField] Transform           _difficultyCardContainer;
        [SerializeField] GameObject          _difficultyCardPrefab;

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

            yield return DifficultySelect();

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
                    yield return _endingManager.ShowEnding(_run.ActiveEnding, won: true);
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

        // ── Difficulty Select ──────────────────────────────────────────────
        IEnumerator DifficultySelect()
        {
            // 難易度パネルが未設定のシーンではスキップし Normal をデフォルトとする
            if (_difficultyPanel == null || _difficultyCardContainer == null || _difficultyCardPrefab == null)
                yield break;

            int maxSelectable = Mathf.Min(
                MetaProgression.MaxUnlockedDifficulty + 1,
                DifficultyConfig.Tiers.Length - 1);

            // 初期選択: 前回解放済みの最高難易度（上限: maxSelectable）
            int chosen    = Mathf.Clamp(MetaProgression.MaxUnlockedDifficulty, 0, maxSelectable);
            bool confirmed = false;

            foreach (Transform child in _difficultyCardContainer) Destroy(child.gameObject);

            var cards = new DifficultySelectCard[DifficultyConfig.Tiers.Length];
            for (int i = 0; i < DifficultyConfig.Tiers.Length; i++)
            {
                int cap    = i;
                bool locked = i > maxSelectable;
                var go   = Instantiate(_difficultyCardPrefab, _difficultyCardContainer);
                var card = go.GetComponent<DifficultySelectCard>()
                           ?? go.AddComponent<DifficultySelectCard>();
                card.Setup(DifficultyConfig.Tiers[i], locked, () =>
                {
                    // 選択変更: ハイライト更新
                    foreach (var c in cards) c?.SetSelected(false);
                    chosen = cap;
                    cards[cap]?.SetSelected(true);
                    confirmed = true;
                });
                cards[i] = card;
            }
            cards[chosen]?.SetSelected(true);

            yield return FadeGroup(_difficultyPanel, 0f, 1f, 0.5f);
            while (!confirmed) yield return null;
            yield return FadeGroup(_difficultyPanel, 1f, 0f, 0.4f);

            _run.DifficultyLevel = chosen;
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
            // 難易度に応じた初期ゴールドと初期呪いを付与する
            var diff = DifficultyConfig.Get(_run.DifficultyLevel);
            if (diff.StartingGold > 0)
                _run.EarnGold(diff.StartingGold);
            if (diff.StartWithCurse)
            {
                var curse = DrawRandomCurse();
                if (curse != null) _run.AddCurse(curse);
            }

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
                    yield return _endingManager.ShowEnding(_run.ActiveEnding, won: true);
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

        // ── Field scene name (all node types share one parametric scene) ──
        // Create "NodeField" in Unity Build Settings; NodeFieldController
        // configures it at runtime based on NodeFieldContext.ActiveNodeType.
        const string NodeFieldScene = "NodeField";

        // ── Node Resolution ────────────────────────────────────────────────
        IEnumerator ResolveNode(MapNode node, int floorIndex)
        {
            _run.LastNodeType = node.Type;
            // All node types expand into the NodeField scene.
            // Treasure loot and CursedRoom effects are handled by EventTrigger
            // (TreasureChest / CursedAltar) inside the field via NodeFieldLoot.
            yield return LoadFieldAndWait(node, floorIndex);
        }

        // ── Additive field-scene loader ────────────────────────────────────
        IEnumerator LoadFieldAndWait(MapNode node, int floorIndex)
        {
            // 1. Build context — survives scene load via DontDestroyOnLoad
            var ctxGO = new GameObject("[NodeFieldContext]");
            var ctx   = ctxGO.AddComponent<NodeFieldContext>();
            ctx.Prepare(node.Type, _currentFloor, floorIndex, _run, BuildCurrentHeroStats);

            // Pre-resolve battle enemies so NodeFieldController can set up fixed fights
            if (node.Type == NodeType.EliteBattle || node.Type == NodeType.Boss)
            {
                bool isElite = node.Type == NodeType.EliteBattle;
                bool isBoss  = node.Type == NodeType.Boss;
                var  enemies = SelectEncounterGroup(isElite, isBoss, NodeContentSeed(node));
                if (enemies != null)
                {
                    ScaleEnemies(enemies, isElite, isBoss);
                    ctx.OverrideEnemies.AddRange(enemies);
                }
            }

            // Pre-select the event so field EventTrigger.EventNPC can run it
            if (node.Type == NodeType.RandomEvent)
                ctx.PendingEvent = _eventManager.SelectEvent(floorIndex, _run.Sanity);

            // 2. Hide the NodeMap HUD, transition out
            yield return FadeGroup(_hud, 1f, 0f, 0.3f);
            _mapUI.gameObject.SetActive(false);
            yield return SceneTransitionManager.Instance?.TransitionOut(
                SceneTransitionManager.TransitionStyle.WipeLeft, 0.4f);

            // 3. Load field scene on top (additive — roguelike scene stays loaded)
            var loadOp = UnityEngine.SceneManagement.SceneManager.LoadSceneAsync(
                NodeFieldScene, UnityEngine.SceneManagement.LoadSceneMode.Additive);
            if (loadOp != null) yield return loadOp;

            yield return SceneTransitionManager.Instance?.TransitionIn(
                SceneTransitionManager.TransitionStyle.WipeLeft, 0.4f);

            // 4. Wait until NodeFieldController signals completion
            while (!ctx.IsComplete) yield return null;

            // 5. Transition out, unload field, restore NodeMap
            yield return SceneTransitionManager.Instance?.TransitionOut(
                SceneTransitionManager.TransitionStyle.WipeLeft, 0.4f);

            var unloadOp = UnityEngine.SceneManagement.SceneManager.UnloadSceneAsync(NodeFieldScene);
            if (unloadOp != null) yield return unloadOp;

            _mapUI.gameObject.SetActive(true);
            yield return FadeGroup(_hud, 0f, 1f, 0.3f);
            yield return SceneTransitionManager.Instance?.TransitionIn(
                SceneTransitionManager.TransitionStyle.WipeLeft, 0.4f);

            // 6. Handle defeat
            if (!ctx.LastResult.WasVictory)
            {
                Destroy(ctxGO);
                // Show defeat ending narrative when the Floor 4 boss beats the player
                if (_run.ActiveEnding != EndingType.None &&
                    node.Type == NodeType.Boss &&
                    _endingManager != null)
                    yield return _endingManager.ShowEnding(_run.ActiveEnding, won: false);
                yield return RunDeath();
                yield break;
            }

            // 7. Process rewards (EXP, gold, drops for battle nodes)
            yield return ProcessNodeResult(node, ctx.LastResult);

            Destroy(ctxGO);
        }

        // ── Post-field reward processing ───────────────────────────────────
        IEnumerator ProcessNodeResult(MapNode node, NodeResult result)
        {
            bool isElite = node.Type == NodeType.EliteBattle;
            bool isBoss  = node.Type == NodeType.Boss;

            if (node.Type != NodeType.Battle &&
                node.Type != NodeType.EliteBattle &&
                node.Type != NodeType.Boss)
                yield break; // Shop / Rest / Event rewards are handled entirely in the field

            var defeated = result.DefeatedEnemies;
            if (defeated.Count == 0) yield break;

            var (exp, jp)  = LevelSystem.ComputeBattleRewards(defeated);
            var levelsGained   = LevelSystem.AddExp(_run, exp, out var statDelta);
            var skillsUnlocked = LevelSystem.AddJP(_run, _run.SelectedCharacter.StarterJob, jp);

            if ((levelsGained.Count > 0 || skillsUnlocked.Count > 0) && _levelUpUI != null)
                yield return _levelUpUI.Show(levelsGained, statDelta, skillsUnlocked);

            int gold = _currentFloor.BaseGoldReward + Random.Range(-10, 20);
            if (isElite && _relicManager.HasEliteHunter()) gold *= 2;

            var drops = ProcessDropTable(defeated);
            if (drops.Count > 0)
            {
                foreach (var (item, qty) in drops)
                    for (int i = 0; i < qty; i++) _run.Inventory.Add(item);
                yield return _lootSystem.ShowDropItems(drops);
            }

            var endingBefore = _run.ActiveEnding;
            yield return _lootSystem.ShowBattleRewards(gold, isElite, isBoss);
            if (_run.ActiveEnding != endingBefore && _endingManager != null)
                yield return _endingManager.ShowPremonition(_run.ActiveEnding);
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
                usedItem => _run.Inventory.Remove(usedItem),
                heroSkills: new List<List<Data.SkillData>> { new List<Data.SkillData>(_run.Deck) });

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

        // ── Treasure ───────────────────────────────────────────────────────
        // ── Enemy Selection ────────────────────────────────────────────────
        // contentSeed > 0 → deterministic (from node.ContentID); 0 → Unity random
        List<EnemyData> SelectEncounterGroup(bool isElite, bool isBoss, int contentSeed = 0)
        {
            // Use System.Random for determinism when seed is provided
            System.Func<int, int>   randInt   = contentSeed > 0
                ? (max => new System.Random(contentSeed).Next(max))
                : (max => Random.Range(0, max));
            System.Func<float, float> randFloat = contentSeed > 0
                ? (max => (float)(new System.Random(contentSeed ^ 0x5DEECE66D).NextDouble() * max))
                : Random.Range;

            if (isBoss)
            {
                if (_currentFloor?.BossPool == null || _currentFloor.BossPool.Count == 0) return null;
                return new List<EnemyData> { _currentFloor.BossPool[randInt(_currentFloor.BossPool.Count)] };
            }

            var pool = isElite ? _currentFloor.EliteEncounters : _currentFloor.NormalEncounters;
            if (pool == null || pool.Count == 0) return null;

            float total = pool.Sum(g => g.AdjustedWeight(_run.Sanity));
            float roll  = randFloat(total);
            float cum   = 0f;

            foreach (var group in pool)
            {
                cum += group.AdjustedWeight(_run.Sanity);
                if (roll < cum) return new List<EnemyData>(group.Enemies);
            }
            return new List<EnemyData>(pool[0].Enemies);
        }

        // Parses the numeric seed from MapNode.ContentID ("typeInt_seed" format)
        static int NodeContentSeed(Map.MapNode node)
        {
            if (string.IsNullOrEmpty(node?.ContentID)) return 0;
            int idx = node.ContentID.IndexOf('_');
            return idx >= 0 && int.TryParse(node.ContentID.Substring(idx + 1), out int s) ? s : 0;
        }

        void ScaleEnemies(List<EnemyData> enemies, bool isElite, bool isBoss)
        {
            if (_currentFloor == null) return;

            var diff = DifficultyConfig.Get(_run?.DifficultyLevel ?? 1);

            float hpMult  = _currentFloor.EnemyHPMultiplier * diff.EnemyHPMult;
            float dmgMult = (isBoss  ? _currentFloor.BossDamageMultiplier
                                     : _currentFloor.EnemyDamageMultiplier)
                          * diff.EnemyDamageMult;
            int   hpBonus = isBoss  ? _currentFloor.BossHPBonus : 0;
            // 盾: フロア基本値 + 難易度エリート盾 (elite時) + 難易度全敵盾
            int   floorSh = isBoss  ? _currentFloor.BossShieldBonus
                          : isElite ? _currentFloor.AdditionalShieldsOnElite + diff.ExtraEliteShields
                          :           0;
            int   shBonus = floorSh + diff.ExtraAllEnemyShields;

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
            MetaProgression.RecordRunEnd(_run, won: false);
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
            MetaProgression.RecordRunEnd(_run, won: true);
            MetaProgression.TryUnlockNextDifficulty(_run.DifficultyLevel);
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
            var diff = DifficultyConfig.Get(_run.DifficultyLevel);
            System.TimeSpan elapsed = System.DateTime.Now - _run.StartTime;
            return $"{(won ? "クリア！" : "力尽きた…")}\n" +
                   $"難易度: {diff.DisplayName}\n" +
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
