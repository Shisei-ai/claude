using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DarkChronicle.Battle;
using DarkChronicle.Data;
using DarkChronicle.Character.Traits;

namespace DarkChronicle.UI
{
    // ── Menu state machine ────────────────────────────────────────────────────
    public enum MenuState { Root, SkillSelect, GrimoireSelect, ItemSelect, TargetSelect }

    /// <summary>
    /// Full in-battle UI controller.
    /// Design references: Octopath Traveler (turn order, HD-2D panels),
    /// Persona 5 (animated command wheel), Slay the Spire (readable status),
    /// Darkest Dungeon (gothic minimalism, status icons).
    /// </summary>
    public sealed class BattleUI : MonoBehaviour
    {
        public static BattleUI Instance { get; private set; }
        // ── Hero panels (bottom bar) ───────────────────────────────────────
        [Header("Hero Status Panels")]
        [SerializeField] HeroStatusPanel[] _heroPanels;

        // ── Command menu ───────────────────────────────────────────────────
        [Header("Command Menu")]
        [SerializeField] CanvasGroup    _commandMenuGroup;
        [SerializeField] RectTransform  _commandMenuRect;
        [SerializeField] Button         _attackButton;
        [SerializeField] Button         _skillButton;
        [SerializeField] Button         _grimoireButton;   // shown only for Zeno
        [SerializeField] Button         _itemButton;
        [SerializeField] Button         _fleeButton;
        [SerializeField] Button         _boostButton;
        [SerializeField] TextMeshProUGUI _boostLabel;
        [SerializeField] Image[]        _bpDots;           // 5 dots (global party BP)
        [SerializeField] Image[]        _boostActiveDots;  // 3 boost slots

        // ── Skill list panel ───────────────────────────────────────────────
        [Header("Skill List")]
        [SerializeField] CanvasGroup    _skillListGroup;
        [SerializeField] RectTransform  _skillListRect;
        [SerializeField] Transform      _skillListContent;
        [SerializeField] GameObject     _skillEntryPrefab;
        [SerializeField] Button         _skillListBackButton;

        // ── Grimoire panel ─────────────────────────────────────────────────
        [Header("Grimoire Panel")]
        [SerializeField] CanvasGroup    _grimoireGroup;
        [SerializeField] RectTransform  _grimoireRect;
        [SerializeField] Transform      _grimoireContent;
        [SerializeField] GameObject     _grimoireEntryPrefab;
        [SerializeField] Button         _grimoireBackButton;
        [SerializeField] TextMeshProUGUI _grimoireStatusText;

        // ── Item list panel ────────────────────────────────────────────────
        [Header("Item List")]
        [SerializeField] CanvasGroup    _itemListGroup;
        [SerializeField] Transform      _itemListContent;
        [SerializeField] GameObject     _itemEntryPrefab;
        [SerializeField] Button         _itemListBackButton;

        // ── Target selection ───────────────────────────────────────────────
        [Header("Target Selection")]
        [SerializeField] GameObject     _targetArrowPrefab;
        [SerializeField] Transform      _targetArrowContainer;
        [SerializeField] TextMeshProUGUI _targetPromptText;
        [SerializeField] CanvasGroup    _targetPromptGroup;

        // ── Enemy status panels ────────────────────────────────────────────
        [Header("Enemy Panels")]
        [SerializeField] Transform      _enemyPanelRoot;
        [SerializeField] GameObject     _enemyPanelPrefab;

        // ── Turn order bar (Octopath-style top strip) ──────────────────────
        [Header("Turn Order")]
        [SerializeField] Transform      _turnOrderRoot;
        [SerializeField] GameObject     _turnOrderIconPrefab;

        // ── Skill name flash ───────────────────────────────────────────────
        [Header("Skill Name Flash")]
        [SerializeField] CanvasGroup    _skillNameGroup;
        [SerializeField] TextMeshProUGUI _skillNameText;

        // ── Message box ────────────────────────────────────────────────────
        [Header("Message")]
        [SerializeField] CanvasGroup    _messageGroup;
        [SerializeField] TextMeshProUGUI _messageText;

        // ── Damage / heal number pooling ───────────────────────────────────
        [Header("Floating Numbers")]
        [SerializeField] GameObject     _damageNumberPrefab;
        [SerializeField] GameObject     _healNumberPrefab;
        [SerializeField] GameObject     _missTextPrefab;
        [SerializeField] Transform      _floatNumberRoot;

        // ── Result screens ─────────────────────────────────────────────────
        [Header("Result Screens")]
        [SerializeField] CanvasGroup    _victoryScreen;
        [SerializeField] CanvasGroup    _defeatScreen;

        // ── State ──────────────────────────────────────────────────────────
        BattleCharacter        _activeHero;
        int                    _pendingBoosts;
        MenuState              _menuState  = MenuState.Root;

        // Target-selection state
        bool                   _awaitingTarget;
        List<BattleCharacter>  _selectableTargets   = new();
        int                    _targetCursorIndex;
        BattleCharacter        _selectedTarget;
        readonly List<GameObject> _targetArrows      = new();

        // Pending skill / grimoire for deferred target-pick
        SkillData              _pendingSkill;
        GrimoireEntry          _pendingGrimoire;
        CommandType            _pendingCommandType;

        // Inventory (set by BattleManager at battle start)
        List<ItemData>         _battleInventory = new();

        // Enemy display tracking
        readonly Dictionary<BattleCharacter, EnemyStatusPanel> _enemyPanels = new();

        // Message queue
        readonly Queue<string>  _messageQueue  = new();
        bool                    _showingMessage;
        Coroutine               _messageRoutine;

        // ── Unity lifecycle ────────────────────────────────────────────────
        void Awake()
        {
            Instance = this;
            _attackButton  .onClick.AddListener(OnAttackPressed);
            _skillButton   .onClick.AddListener(OnSkillPressed);
            _grimoireButton.onClick.AddListener(OnGrimoirePressed);
            _itemButton    .onClick.AddListener(OnItemPressed);
            _fleeButton    .onClick.AddListener(OnFleePressed);
            _boostButton   .onClick.AddListener(OnBoostPressed);

            _skillListBackButton  .onClick.AddListener(() => TransitionTo(MenuState.Root));
            _grimoireBackButton   .onClick.AddListener(() => TransitionTo(MenuState.Root));
            _itemListBackButton   .onClick.AddListener(() => TransitionTo(MenuState.Root));

            GrimoireUIBridge.OnGrimoireUpdate += OnGrimoireUpdated;

            HideAll();
        }

        void OnDestroy()
        {
            GrimoireUIBridge.OnGrimoireUpdate -= OnGrimoireUpdated;
        }

        void HideAll()
        {
            SetGroupVisible(_commandMenuGroup, false, instant: true);
            SetGroupVisible(_skillListGroup,   false, instant: true);
            SetGroupVisible(_grimoireGroup,    false, instant: true);
            SetGroupVisible(_itemListGroup,    false, instant: true);
            SetGroupVisible(_targetPromptGroup, false, instant: true);
            SetGroupVisible(_skillNameGroup,   false, instant: true);
            SetGroupVisible(_messageGroup,     false, instant: true);
            if (_victoryScreen) { _victoryScreen.alpha = 0f; _victoryScreen.blocksRaycasts = false; }
            if (_defeatScreen)  { _defeatScreen .alpha = 0f; _defeatScreen .blocksRaycasts = false; }
        }

        // ── Public API (called by BattleManager) ───────────────────────────
        public void InitHeroPanel(int index, BattleCharacter hero)
        {
            if (index >= 0 && index < _heroPanels.Length)
                _heroPanels[index].Refresh(hero);
        }

        public void ShowPlayerCommandMenu(BattleCharacter hero)
        {
            _activeHero    = hero;
            _pendingBoosts = 0;
            _pendingSkill  = null;
            _pendingGrimoire = null;
            TransitionTo(MenuState.Root);

            bool silenced = hero.IsSilenced;

            // Skill button — greyed out when silenced
            _skillButton.interactable = !silenced;

            // Grimoire button — shown only for Zeno, greyed out when silenced
            bool hasGrimoire = hero.Traits.GetTrait<Trait_GrimoireMaster>() != null;
            _grimoireButton.gameObject.SetActive(hasGrimoire);
            if (hasGrimoire)
            {
                var gm = hero.Traits.GetTrait<Trait_GrimoireMaster>();
                _grimoireButton.interactable = !silenced && gm.GrimoireSystem.HasAnyEntry;
            }

            if (_itemButton != null)
                _itemButton.interactable = _battleInventory.Count > 0;

            RefreshBPDisplay(hero);
            RefreshBoostDisplay();
        }

        public void HighlightActive(BattleCharacter c)
        {
            foreach (var p in _heroPanels) p.SetHighlight(false);
            if (c.IsPlayer) GetHeroPanel(c)?.SetHighlight(true);
        }

        public void UpdateHeroPanel(BattleCharacter hero)
        {
            GetHeroPanel(hero)?.Refresh(hero);
        }

        public void RegisterEnemy(BattleCharacter enemy, Vector3 worldPos)
        {
            if (_enemyPanelPrefab == null || _enemyPanelRoot == null) return;
            var go = Instantiate(_enemyPanelPrefab, _enemyPanelRoot);
            var panel = go.GetComponent<EnemyStatusPanel>();
            if (panel == null) return;
            panel.Setup(enemy, worldPos);
            _enemyPanels[enemy] = panel;
        }

        public void UpdateEnemyPanel(BattleCharacter enemy)
        {
            if (_enemyPanels.TryGetValue(enemy, out var panel)) panel.Refresh(enemy);
        }

        public void RemoveEnemyPanel(BattleCharacter enemy)
        {
            if (_enemyPanels.TryGetValue(enemy, out var panel))
            {
                Destroy(panel.gameObject);
                _enemyPanels.Remove(enemy);
            }
        }

        public void UpdateTurnOrder(List<BattleCharacter> order)
        {
            foreach (Transform child in _turnOrderRoot) Destroy(child.gameObject);
            int shown = Mathf.Min(order.Count, 9);
            for (int i = 0; i < shown; i++)
            {
                var icon = Instantiate(_turnOrderIconPrefab, _turnOrderRoot)
                           .GetComponent<TurnOrderIcon>();
                icon?.Setup(order[i], i == 0);
            }
        }

        public void ShowDamageNumber(BattleCharacter target, int amount, bool isCrit)
        {
            var go  = SpawnFloat(_damageNumberPrefab, GetTargetScreenPos(target));
            if (go == null) return;
            var txt = go.GetComponentInChildren<TextMeshProUGUI>();
            if (txt == null) return;
            txt.text  = isCrit ? $"<b>{amount}</b>!" : amount.ToString();
            txt.color = isCrit ? new Color(1f, 0.85f, 0.1f) : Color.white;
            float rise = isCrit ? 2.0f : 1.4f;
            StartCoroutine(UIAnimator.FloatFade(go.transform, Vector3.up * rise, isCrit ? 1.4f : 1.0f));
        }

        public void ShowHealNumber(BattleCharacter target, int amount)
        {
            var go  = SpawnFloat(_healNumberPrefab, GetTargetScreenPos(target));
            if (go == null) return;
            var txt = go.GetComponentInChildren<TextMeshProUGUI>();
            if (txt != null) { txt.text = $"+{amount}"; txt.color = new Color(0.3f, 1f, 0.55f); }
            StartCoroutine(UIAnimator.FloatFade(go.transform, Vector3.up * 1.2f, 1.0f));
        }

        public void ShowMissText(BattleCharacter target)
        {
            var go  = SpawnFloat(_missTextPrefab, GetTargetScreenPos(target));
            if (go == null) return;
            var txt = go.GetComponentInChildren<TextMeshProUGUI>();
            if (txt != null) { txt.text = "MISS"; txt.color = new Color(0.8f, 0.8f, 0.8f); }
            StartCoroutine(UIAnimator.FloatFade(go.transform, Vector3.up * 1.0f, 0.8f));
        }

        public void ShowSkillName(string skillName)
        {
            StopCoroutine(nameof(FlashSkillNameRoutine));
            StartCoroutine(FlashSkillNameRoutine(skillName));
        }

        public void ShowMessage(string msg)
        {
            _messageQueue.Enqueue(msg);
            if (!_showingMessage) StartCoroutine(DrainMessageQueue());
        }

        public void ShowBreakEffect(BattleCharacter enemy)
        {
            ShowMessage($"【BREAK】 {enemy.DisplayName}！");
            if (_enemyPanels.TryGetValue(enemy, out var panel))
            {
                var g = panel.GetComponent<Graphic>();
                if (g != null)
                    StartCoroutine(UIAnimator.FlashColor(g, new Color(1f, 0.5f, 0f), 0.6f));
            }
        }

        public void ShowDefeatAnimation(BattleCharacter c)
        {
            if (c.IsPlayer) GetHeroPanel(c)?.PlayDefeatAnimation();
            else RemoveEnemyPanel(c);
        }

        public void PlayIntroAnimation() => StartCoroutine(IntroAnimationRoutine());

        public void ShowVictoryScreen() => StartCoroutine(UIAnimator.FadeIn(_victoryScreen));
        public void ShowDefeatScreen()  => StartCoroutine(UIAnimator.FadeIn(_defeatScreen));

        public void ShowTraitActivated(string traitName, BattleCharacter owner)
        {
            ShowMessage($"【{traitName}】発動！");
            if (!owner.IsPlayer) return;
            var panel = GetHeroPanel(owner);
            if (panel?.Root == null) return;
            var imgs = panel.Root.GetComponentsInChildren<Graphic>();
            if (imgs.Length > 0)
                StartCoroutine(UIAnimator.FlashColor(imgs[0], new Color(1f, 0.85f, 0.3f), 0.7f));
        }

        public void ShowStackCount(BattleCharacter owner, int stacks, int maxStacks, string label)
        {
            if (!owner.IsPlayer) return;
            var panel = GetHeroPanel(owner);
            if (panel?.CharacterStateLabel != null)
                panel.CharacterStateLabel.text = $"{label} {stacks}/{maxStacks}";
        }

        // ── Menu state transitions ─────────────────────────────────────────
        void TransitionTo(MenuState next)
        {
            _menuState = next;
            bool atRoot    = next == MenuState.Root;
            bool atSkill   = next == MenuState.SkillSelect;
            bool atGrim    = next == MenuState.GrimoireSelect;
            bool atItem    = next == MenuState.ItemSelect;
            bool atTarget  = next == MenuState.TargetSelect;

            SetGroupVisible(_commandMenuGroup, atRoot);
            SetGroupVisible(_skillListGroup,   atSkill);
            SetGroupVisible(_grimoireGroup,    atGrim);
            SetGroupVisible(_itemListGroup,    atItem);
            SetGroupVisible(_targetPromptGroup, atTarget);

            if (atRoot && _commandMenuRect)
                StartCoroutine(UIAnimator.SlideIn(_commandMenuRect,
                    new Vector2(-40f, _commandMenuRect.anchoredPosition.y),
                    new Vector2(0f,   _commandMenuRect.anchoredPosition.y), 0.18f));
        }

        // ── Button handlers ────────────────────────────────────────────────
        void OnAttackPressed()
        {
            _pendingCommandType = CommandType.Attack;
            BeginTargetSelection(GetLivingEnemies(), "攻撃対象を選択", isSingleTarget: true);
        }

        void OnSkillPressed()
        {
            TransitionTo(MenuState.SkillSelect);
            PopulateSkillList();
        }

        void OnGrimoirePressed()
        {
            TransitionTo(MenuState.GrimoireSelect);
            PopulateGrimoireList();
        }

        void OnItemPressed()
        {
            TransitionTo(MenuState.ItemSelect);
            PopulateItemList();
        }

        void OnFleePressed()
        {
            TransitionTo(MenuState.Root);
            HideCommandMenu();
            BattleManager.Instance.PlayerCommandSelected(new BattleCommand { Type = CommandType.Flee });
        }

        void OnBoostPressed()
        {
            if (_activeHero == null || _activeHero.BP <= 0 || _pendingBoosts >= 3) return;
            if (_activeHero.UseBoost(1))
            {
                _pendingBoosts++;
                RefreshBPDisplay(_activeHero);
                RefreshBoostDisplay();
                if (_commandMenuRect)
                    StartCoroutine(UIAnimator.Punch(_commandMenuRect, 1.06f, 0.15f));
            }
        }

        // ── Skill list population ──────────────────────────────────────────
        void PopulateSkillList()
        {
            foreach (Transform child in _skillListContent) Destroy(child.gameObject);

            if (_activeHero == null || _activeHero.Skills.Count == 0) return;

            foreach (var skill in _activeHero.Skills)
            {
                var entry = Instantiate(_skillEntryPrefab, _skillListContent);
                var texts = entry.GetComponentsInChildren<TextMeshProUGUI>();
                bool canAfford = _activeHero.MP >= skill.MPCost;

                // Layout: Name | MP cost | Boost preview
                if (texts.Length >= 1) texts[0].text  = skill.SkillName;
                if (texts.Length >= 2)
                {
                    texts[1].text  = $"MP {skill.MPCost}";
                    texts[1].color = canAfford ? Color.white : new Color(0.6f, 0.2f, 0.2f);
                }
                if (texts.Length >= 3 && _pendingBoosts > 0)
                {
                    string preview = BoostSkillResolver.GetBoostPreviewText(skill, _pendingBoosts);
                    texts[2].text  = string.IsNullOrEmpty(preview) ? string.Empty : $"[×{_pendingBoosts + 1}] {preview}";
                }

                // Element color indicator
                var icon = entry.GetComponentInChildren<Image>();
                if (icon != null) icon.color = GetElementColor(skill.Element);

                var btn = entry.GetComponent<Button>();
                if (btn != null)
                {
                    btn.interactable = canAfford;
                    var captured = skill;
                    btn.onClick.AddListener(() => OnSkillSelected(captured));
                }
            }
        }

        void OnSkillSelected(SkillData skill)
        {
            _pendingSkill       = skill;
            _pendingCommandType = CommandType.Skill;

            if (skill.HitsAllEnemies)
            {
                ConfirmSkillCommand(GetLivingEnemies());
                return;
            }
            if (skill.HitsAllAllies)
            {
                ConfirmSkillCommand(GetLivingHeroes());
                return;
            }
            if (skill.IsHeal || skill.IsRevive)
            {
                var targets = skill.IsRevive
                    ? GetHeroes().Where(h => !h.IsAlive).ToList()
                    : GetLivingHeroes();
                BeginTargetSelection(targets, skill.SkillName, isSingleTarget: true);
                return;
            }

            BeginTargetSelection(GetLivingEnemies(), skill.SkillName, isSingleTarget: true);
        }

        void ConfirmSkillCommand(List<BattleCharacter> targets)
        {
            HideCommandMenu();
            BattleManager.Instance.PlayerCommandSelected(new BattleCommand
            {
                Type       = CommandType.Skill,
                Skill      = _pendingSkill,
                Targets    = targets,
                BoostLevel = _pendingBoosts,
            });
        }

        // ── Grimoire list population ───────────────────────────────────────
        void PopulateGrimoireList()
        {
            foreach (Transform child in _grimoireContent) Destroy(child.gameObject);

            var gm = _activeHero?.Traits.GetTrait<Trait_GrimoireMaster>();
            if (gm == null) return;

            var system = gm.GrimoireSystem;
            if (_grimoireStatusText)
                _grimoireStatusText.text = $"スロット {system.SlotCount}/{GrimoireSystem.MaxSlots}";

            for (int i = 0; i < system.Slots.Count; i++)
            {
                var entry = Instantiate(_grimoireEntryPrefab, _grimoireContent);
                var gEntry = system.Slots[i];
                var texts  = entry.GetComponentsInChildren<TextMeshProUGUI>();
                if (texts.Length >= 1) texts[0].text = gEntry.DisplayName;
                if (texts.Length >= 2) texts[1].text = $"MP {gEntry.OverrideMPCost}";

                bool canAfford = _activeHero.MP >= gEntry.OverrideMPCost;
                var btn = entry.GetComponent<Button>();
                if (btn != null)
                {
                    btn.interactable = canAfford;
                    var captured = gEntry;
                    btn.onClick.AddListener(() => OnGrimoireEntrySelected(captured));
                }
            }
        }

        void OnGrimoireEntrySelected(GrimoireEntry entry)
        {
            _pendingGrimoire    = entry;
            _pendingCommandType = CommandType.GrimoireSkill;

            bool hitsAll = entry.BaseSkill?.HitsAllEnemies ?? false;
            if (hitsAll)
            {
                HideCommandMenu();
                BattleManager.Instance.PlayerCommandSelected(new BattleCommand
                {
                    Type         = CommandType.GrimoireSkill,
                    GrimoireSkill = entry,
                    Targets      = GetLivingEnemies(),
                });
                return;
            }
            BeginTargetSelection(GetLivingEnemies(), entry.DisplayName, isSingleTarget: true);
        }

        void OnGrimoireUpdated(GrimoireSystem system)
        {
            if (_menuState == MenuState.GrimoireSelect) PopulateGrimoireList();
        }

        // ── Item list population ───────────────────────────────────────────
        public void SetBattleInventory(List<ItemData> inventory)
        {
            _battleInventory = inventory ?? new List<ItemData>();
            if (_menuState == MenuState.ItemSelect) PopulateItemList();
            if (_itemButton != null)
                _itemButton.interactable = _battleInventory.Count > 0;
        }

        void PopulateItemList()
        {
            foreach (Transform child in _itemListContent) Destroy(child.gameObject);
            var grouped = _battleInventory
                .GroupBy(i => i.name)
                .Select(g => (g.First(), g.Count()))
                .ToList();
            RefreshItemList(grouped);
        }

        public void RefreshItemList(List<(ItemData item, int count)> inventory)
        {
            if (_menuState != MenuState.ItemSelect) return;
            foreach (Transform child in _itemListContent) Destroy(child.gameObject);

            foreach (var (item, count) in inventory)
            {
                var entry = Instantiate(_itemEntryPrefab, _itemListContent);
                var texts = entry.GetComponentsInChildren<TextMeshProUGUI>();
                if (texts.Length >= 1) texts[0].text = item.ItemName;
                if (texts.Length >= 2) texts[1].text = $"×{count}";
                if (texts.Length >= 3) texts[2].text = item.Description;

                var btn = entry.GetComponent<Button>();
                if (btn != null)
                {
                    var captured = item;
                    btn.onClick.AddListener(() => OnItemSelected(captured));
                }
            }
        }

        void OnItemSelected(ItemData item)
        {
            if (item.IsAllyTarget)
            {
                var targets = item.ReviveTarget
                    ? GetHeroes().Where(h => !h.IsAlive).ToList()
                    : GetLivingHeroes();
                BeginTargetSelection(targets, item.ItemName, isSingleTarget: true,
                                     onConfirm: t =>
                {
                    HideCommandMenu();
                    BattleManager.Instance.PlayerCommandSelected(new BattleCommand
                    {
                        Type    = CommandType.Item,
                        Item    = item,
                        Targets = new List<BattleCharacter> { t },
                    });
                });
                return;
            }
            BeginTargetSelection(GetLivingEnemies(), item.ItemName, isSingleTarget: true,
                                 onConfirm: t =>
            {
                HideCommandMenu();
                BattleManager.Instance.PlayerCommandSelected(new BattleCommand
                {
                    Type    = CommandType.Item,
                    Item    = item,
                    Targets = new List<BattleCharacter> { t },
                });
            });
        }

        // ── Target selection system ────────────────────────────────────────
        System.Action<BattleCharacter> _targetConfirmCallback;

        void BeginTargetSelection(List<BattleCharacter> candidates, string prompt,
                                   bool isSingleTarget = true,
                                   System.Action<BattleCharacter> onConfirm = null)
        {
            _selectableTargets    = candidates;
            _targetCursorIndex    = 0;
            _targetConfirmCallback = onConfirm;

            if (candidates == null || candidates.Count == 0)
            {
                ConfirmCurrentTarget();
                return;
            }

            TransitionTo(MenuState.TargetSelect);
            if (_targetPromptText) _targetPromptText.text = prompt;
            SpawnTargetArrows();
            StartCoroutine(TargetSelectionRoutine());
        }

        IEnumerator TargetSelectionRoutine()
        {
            _awaitingTarget = true;
            UpdateTargetArrows();

            while (_awaitingTarget)
            {
                // Keyboard / gamepad navigation
                if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D))
                {
                    _targetCursorIndex = (_targetCursorIndex + 1) % _selectableTargets.Count;
                    UpdateTargetArrows();
                    yield return null;
                    continue;
                }
                if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A))
                {
                    _targetCursorIndex = (_targetCursorIndex - 1 + _selectableTargets.Count)
                                         % _selectableTargets.Count;
                    UpdateTargetArrows();
                    yield return null;
                    continue;
                }
                if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.Z))
                {
                    ConfirmCurrentTarget();
                    yield break;
                }
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.X))
                {
                    CancelTargetSelection();
                    yield break;
                }
                yield return null;
            }
        }

        void SpawnTargetArrows()
        {
            ClearTargetArrows();
            if (_targetArrowPrefab == null || _targetArrowContainer == null) return;
            foreach (var _ in _selectableTargets)
            {
                var arrow = Instantiate(_targetArrowPrefab, _targetArrowContainer);
                _targetArrows.Add(arrow);
            }
        }

        void UpdateTargetArrows()
        {
            for (int i = 0; i < _targetArrows.Count && i < _selectableTargets.Count; i++)
            {
                bool active = i == _targetCursorIndex;
                _targetArrows[i].SetActive(active);
                // Position over the enemy/hero — requires world-to-screen mapping
                var screenPos = GetTargetScreenPos(_selectableTargets[i]);
                var rt = _targetArrows[i].GetComponent<RectTransform>();
                if (rt != null) rt.position = screenPos + Vector3.up * 60f;
            }
        }

        void ConfirmCurrentTarget()
        {
            _awaitingTarget = false;
            ClearTargetArrows();
            TransitionTo(MenuState.Root);

            BattleCharacter target = _selectableTargets.Count > 0
                ? _selectableTargets[_targetCursorIndex]
                : null;

            if (_targetConfirmCallback != null)
            {
                _targetConfirmCallback.Invoke(target);
                return;
            }

            // Default: route to pending command
            HideCommandMenu();
            switch (_pendingCommandType)
            {
                case CommandType.Attack:
                    BattleManager.Instance.PlayerCommandSelected(new BattleCommand
                    {
                        Type       = CommandType.Attack,
                        Targets    = target != null ? new List<BattleCharacter> { target } : new(),
                        BoostLevel = _pendingBoosts,
                    });
                    break;
                case CommandType.Skill:
                    BattleManager.Instance.PlayerCommandSelected(new BattleCommand
                    {
                        Type       = CommandType.Skill,
                        Skill      = _pendingSkill,
                        Targets    = target != null ? new List<BattleCharacter> { target } : new(),
                        BoostLevel = _pendingBoosts,
                    });
                    break;
                case CommandType.GrimoireSkill:
                    BattleManager.Instance.PlayerCommandSelected(new BattleCommand
                    {
                        Type          = CommandType.GrimoireSkill,
                        GrimoireSkill = _pendingGrimoire,
                        Targets       = target != null ? new List<BattleCharacter> { target } : new(),
                    });
                    break;
            }
        }

        void CancelTargetSelection()
        {
            _awaitingTarget = false;
            ClearTargetArrows();
            TransitionTo(_pendingCommandType == CommandType.Skill         ? MenuState.SkillSelect
                       : _pendingCommandType == CommandType.GrimoireSkill ? MenuState.GrimoireSelect
                       : _pendingCommandType == CommandType.Item          ? MenuState.ItemSelect
                       : MenuState.Root);
        }

        void ClearTargetArrows()
        {
            foreach (var a in _targetArrows) if (a) Destroy(a);
            _targetArrows.Clear();
        }

        void HideCommandMenu()
        {
            SetGroupVisible(_commandMenuGroup,  false);
            SetGroupVisible(_skillListGroup,    false);
            SetGroupVisible(_grimoireGroup,     false);
            SetGroupVisible(_itemListGroup,     false);
            SetGroupVisible(_targetPromptGroup, false);
        }

        // ── BP / Boost display ─────────────────────────────────────────────
        void RefreshBPDisplay(BattleCharacter hero)
        {
            for (int i = 0; i < _bpDots.Length; i++)
                _bpDots[i].color = i < hero.BP
                    ? new Color(1f, 0.85f, 0.2f)
                    : new Color(0.18f, 0.18f, 0.22f);
        }

        void RefreshBoostDisplay()
        {
            for (int i = 0; i < _boostActiveDots.Length; i++)
                _boostActiveDots[i].color = i < _pendingBoosts
                    ? new Color(1f, 0.55f, 0.1f)
                    : new Color(0.18f, 0.18f, 0.22f);

            if (_boostLabel)
                _boostLabel.text = _pendingBoosts > 0 ? $"BOOST ×{_pendingBoosts + 1}" : "BOOST";

            _boostButton.interactable = _activeHero != null
                                     && _activeHero.BP > 0
                                     && _pendingBoosts < 3;
        }

        // ── Helpers ────────────────────────────────────────────────────────
        HeroStatusPanel GetHeroPanel(BattleCharacter hero)
        {
            foreach (var p in _heroPanels)
                if (p.Character == hero) return p;
            return null;
        }

        List<BattleCharacter> GetLivingEnemies() =>
            _enemyPanels.Keys.Where(e => e.IsAlive).ToList();

        List<BattleCharacter> GetLivingHeroes() =>
            _heroPanels.Select(p => p.Character).Where(h => h != null && h.IsAlive).ToList();

        List<BattleCharacter> GetHeroes() =>
            _heroPanels.Select(p => p.Character).Where(h => h != null).ToList();

        Vector3 GetTargetScreenPos(BattleCharacter c)
        {
            // Panels carry their own RectTransform; fall back to zero if unknown
            if (c == null) return Vector3.zero;
            if (!c.IsPlayer && _enemyPanels.TryGetValue(c, out var ep))
                return ep.transform.position;
            var hp = GetHeroPanel(c);
            return hp != null ? hp.GetWorldPosition() : Vector3.zero;
        }

        GameObject SpawnFloat(GameObject prefab, Vector3 position)
        {
            if (prefab == null) return null;
            var go = Instantiate(prefab, _floatNumberRoot != null ? _floatNumberRoot : transform);
            go.transform.position = position;
            return go;
        }

        static Color GetElementColor(ElementType el) => el switch
        {
            ElementType.Fire      => new Color(1f,  0.4f, 0.1f),
            ElementType.Ice       => new Color(0.4f, 0.8f, 1f),
            ElementType.Lightning => new Color(1f,  0.95f, 0.1f),
            ElementType.Wind      => new Color(0.4f, 1f,  0.4f),
            ElementType.Dark      => new Color(0.6f, 0.1f, 0.8f),
            ElementType.Light     => new Color(1f,  1f,  0.7f),
            ElementType.Poison    => new Color(0.5f, 0.9f, 0.2f),
            ElementType.Bleed     => new Color(0.9f, 0.15f, 0.15f),
            _                     => Color.gray,
        };

        void SetGroupVisible(CanvasGroup g, bool visible, bool instant = false)
        {
            if (g == null) return;
            if (instant)
            {
                g.alpha          = visible ? 1f : 0f;
                g.blocksRaycasts = visible;
                g.interactable   = visible;
                return;
            }
            g.blocksRaycasts = visible;
            g.interactable   = visible;
            StartCoroutine(visible ? UIAnimator.FadeIn(g)
                                   : UIAnimator.FadeOut(g));
        }

        // ── Coroutines ─────────────────────────────────────────────────────
        IEnumerator FlashSkillNameRoutine(string name)
        {
            _skillNameText.text = name;
            yield return StartCoroutine(UIAnimator.FadeIn(_skillNameGroup, 0.18f));
            yield return new WaitForSecondsRealtime(0.75f);
            yield return StartCoroutine(UIAnimator.FadeOut(_skillNameGroup, 0.3f));
        }

        IEnumerator DrainMessageQueue()
        {
            _showingMessage = true;
            while (_messageQueue.Count > 0)
            {
                string msg = _messageQueue.Dequeue();
                _messageText.text = msg;
                yield return StartCoroutine(UIAnimator.FadeIn(_messageGroup, 0.15f));
                yield return new WaitForSecondsRealtime(1.2f);
                yield return StartCoroutine(UIAnimator.FadeOut(_messageGroup, 0.25f));
                yield return new WaitForSecondsRealtime(0.1f);
            }
            _showingMessage = false;
        }

        IEnumerator IntroAnimationRoutine()
        {
            // Slide all hero panels up from below
            foreach (var panel in _heroPanels)
            {
                var rt = panel.GetRectTransform();
                if (rt == null) continue;
                Vector2 to = rt.anchoredPosition;
                Vector2 from = to + Vector2.down * 120f;
                StartCoroutine(UIAnimator.SlideIn(rt, from, to, 0.35f));
                yield return new WaitForSecondsRealtime(0.06f);
            }
            yield return new WaitForSecondsRealtime(0.3f);
        }
    }

    // ── Hero Status Panel (serializable component) ────────────────────────────
    [System.Serializable]
    public class HeroStatusPanel
    {
        [Header("References")]
        public BattleCharacter   Character;
        public RectTransform     Root;
        public TextMeshProUGUI   NameText;
        public Slider            HPSlider;
        public Slider            MPSlider;
        public TextMeshProUGUI   HPText;
        public TextMeshProUGUI   MPText;
        public Image             Portrait;
        public CanvasGroup       Group;
        public Image             HighlightFrame;

        [Header("BP Dots")]
        public Image[]           BPDots;              // 5 dots

        [Header("Status Icons")]
        public Transform         StatusIconRoot;
        public GameObject        StatusIconPrefab;

        [Header("Character Indicators")]
        public GameObject        ShadowStateIndicator; // Ash: lit when in Shadow State
        public TextMeshProUGUI   CharacterStateLabel;  // Zeno DarkWill / Lavinia resonance

        public void Refresh(BattleCharacter c)
        {
            Character = c;
            if (NameText) NameText.text = c.DisplayName;
            if (HPSlider) HPSlider.value = c.HPRatio;
            if (MPSlider) MPSlider.value = c.MaxMP > 0 ? (float)c.MP / c.MaxMP : 0f;
            if (HPText)   HPText.text    = $"{c.HP}/{c.MaxHP}";
            if (MPText)   MPText.text    = $"{c.MP}/{c.MaxMP}";

            RefreshBPDots(c);
            RefreshStatusIcons(c);
            RefreshCharacterIndicators(c);

            // Dim portrait when low HP
            if (Portrait)
                Portrait.color = c.HPRatio < 0.25f
                    ? new Color(1f, 0.55f, 0.55f)
                    : Color.white;
        }

        void RefreshBPDots(BattleCharacter c)
        {
            if (BPDots == null) return;
            for (int i = 0; i < BPDots.Length; i++)
            {
                if (BPDots[i] == null) continue;
                bool filled = i < c.BP;
                BPDots[i].color = filled ? new Color(1f, 0.85f, 0.2f)
                                         : new Color(0.15f, 0.15f, 0.18f);
            }
        }

        void RefreshStatusIcons(BattleCharacter c)
        {
            if (StatusIconRoot == null) return;
            foreach (Transform child in StatusIconRoot)
                Object.Destroy(child.gameObject);

            foreach (var s in c.StatusEffects)
            {
                if (StatusIconPrefab == null) break;
                var icon = Object.Instantiate(StatusIconPrefab, StatusIconRoot);
                var img  = icon.GetComponent<Image>();
                var txt  = icon.GetComponentInChildren<TextMeshProUGUI>();
                if (img) img.color = GetStatusColor(s.Type);
                if (txt) txt.text  = GetStatusAbbrev(s.Type);
                var tip = icon.AddComponent<TooltipTrigger>();
                tip.SetText(GetStatusName(s.Type), $"残り {s.RemainingTurns} ターン");
            }
        }

        void RefreshCharacterIndicators(BattleCharacter c)
        {
            // Shadow State (Ash)
            var shadowTrait = c.Traits?.GetTrait<Trait_ShadowDance>();
            if (ShadowStateIndicator)
                ShadowStateIndicator.SetActive(shadowTrait != null && shadowTrait.IsInShadowState);

            // DarkWill state label (Zeno) or other indicators
            if (CharacterStateLabel)
            {
                var darkWill = c.Traits?.GetTrait<Trait_DarkWill>();
                if (darkWill != null)
                    CharacterStateLabel.text = darkWill.GetStateLabel(c);
                else
                    CharacterStateLabel.text = string.Empty;
            }
        }

        public void SetHighlight(bool active)
        {
            if (HighlightFrame) HighlightFrame.enabled = active;
        }

        public void PlayDefeatAnimation()
        {
            if (Portrait) Portrait.color = new Color(0.45f, 0.45f, 0.45f, 0.7f);
            if (Group)
            {
                Group.alpha = 0.5f;
                Group.interactable = false;
            }
            if (NameText) NameText.color = new Color(0.6f, 0.6f, 0.6f);
        }

        public Vector3 GetWorldPosition()
        {
            return Root != null ? Root.position : Vector3.zero;
        }

        public RectTransform GetRectTransform() => Root;

        static Color GetStatusColor(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => new Color(0.5f,  0.9f,  0.2f),
            StatusEffectType.Bleed     => new Color(0.9f,  0.15f, 0.15f),
            StatusEffectType.Burn      => new Color(1f,    0.45f, 0.1f),
            StatusEffectType.Freeze    => new Color(0.5f,  0.85f, 1f),
            StatusEffectType.Paralysis => new Color(1f,    0.9f,  0.1f),
            StatusEffectType.Sleep     => new Color(0.5f,  0.5f,  0.9f),
            StatusEffectType.Blind     => new Color(0.3f,  0.3f,  0.4f),
            StatusEffectType.Silence   => new Color(0.7f,  0.4f,  0.8f),
            StatusEffectType.AtkUp     => new Color(1f,    0.6f,  0.2f),
            StatusEffectType.AtkDown   => new Color(0.4f,  0.4f,  0.85f),
            StatusEffectType.DefUp     => new Color(0.3f,  0.65f, 1f),
            StatusEffectType.DefDown   => new Color(0.7f,  0.2f,  0.2f),
            StatusEffectType.SpdUp     => new Color(0.35f, 1f,    0.85f),
            StatusEffectType.SpdDown   => new Color(0.5f,  0.35f, 0.35f),
            StatusEffectType.Regen     => new Color(0.3f,  1f,    0.5f),
            _                          => Color.grey,
        };

        static string GetStatusAbbrev(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => "毒",
            StatusEffectType.Bleed     => "出血",
            StatusEffectType.Burn      => "炎",
            StatusEffectType.Freeze    => "氷",
            StatusEffectType.Paralysis => "麻",
            StatusEffectType.Sleep     => "眠",
            StatusEffectType.Blind     => "暗",
            StatusEffectType.Silence   => "沈",
            StatusEffectType.AtkUp     => "攻↑",
            StatusEffectType.AtkDown   => "攻↓",
            StatusEffectType.DefUp     => "防↑",
            StatusEffectType.DefDown   => "防↓",
            StatusEffectType.SpdUp     => "速↑",
            StatusEffectType.SpdDown   => "速↓",
            StatusEffectType.Regen     => "再生",
            _                          => t.ToString()[..2],
        };

        static string GetStatusName(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => "毒",
            StatusEffectType.Bleed     => "出血",
            StatusEffectType.Burn      => "炎上",
            StatusEffectType.Freeze    => "凍結",
            StatusEffectType.Paralysis => "麻痺",
            StatusEffectType.Sleep     => "睡眠",
            StatusEffectType.Blind     => "暗闇",
            StatusEffectType.Silence   => "沈黙",
            StatusEffectType.AtkUp     => "攻撃力上昇",
            StatusEffectType.AtkDown   => "攻撃力低下",
            StatusEffectType.DefUp     => "防御力上昇",
            StatusEffectType.DefDown   => "防御力低下",
            StatusEffectType.SpdUp     => "速度上昇",
            StatusEffectType.SpdDown   => "速度低下",
            StatusEffectType.Regen     => "リジェネ",
            _                          => t.ToString(),
        };
    }

    // ── Enemy Status Panel (MonoBehaviour, instantiated per enemy) ────────────
    public class EnemyStatusPanel : MonoBehaviour
    {
        [SerializeField] TextMeshProUGUI  _nameText;
        [SerializeField] Slider          _hpSlider;
        [SerializeField] TextMeshProUGUI  _hpText;
        [SerializeField] Transform        _shieldIconRoot;
        [SerializeField] GameObject       _shieldIconPrefab;
        [SerializeField] GameObject       _breakOverlay;
        [SerializeField] Transform        _statusIconRoot;
        [SerializeField] GameObject       _statusIconPrefab;
        [SerializeField] Image            _rankBadge;

        static readonly Color EnemyHPColor    = new(0.9f, 0.25f, 0.25f);
        static readonly Color BossHPColor     = new(0.7f, 0.1f,  0.8f);
        static readonly Color EliteHPColor    = new(0.9f, 0.55f, 0.1f);
        static readonly Color NormalHPColor   = new(0.85f, 0.2f, 0.2f);

        public void Setup(BattleCharacter enemy, Vector3 worldPos)
        {
            transform.position = worldPos;
            Refresh(enemy);

            // Rank badge color
            if (_rankBadge && enemy.EnemyData != null)
            {
                _rankBadge.color = enemy.EnemyData.Rank switch
                {
                    EnemyRank.Boss          => BossHPColor,
                    EnemyRank.TrueFinalBoss => new Color(1f, 0f, 0.5f),
                    EnemyRank.Elite         => EliteHPColor,
                    _                       => Color.clear,
                };
                _rankBadge.gameObject.SetActive(enemy.EnemyData.Rank != EnemyRank.Normal);
            }
        }

        public void Refresh(BattleCharacter enemy)
        {
            if (_nameText) _nameText.text = enemy.DisplayName;

            float hpRatio = enemy.HPRatio;
            if (_hpSlider) _hpSlider.value = hpRatio;
            if (_hpText)   _hpText.text    = $"{enemy.HP}/{enemy.MaxHP}";
            if (_hpSlider?.fillRect?.GetComponent<Image>() is Image fill)
                fill.color = hpRatio < 0.25f ? new Color(0.95f, 0.1f, 0.1f) : EnemyHPColor;

            RefreshShieldIcons(enemy);
            RefreshStatusIcons(enemy);
            if (_breakOverlay) _breakOverlay.SetActive(enemy.IsBroken);
        }

        void RefreshShieldIcons(BattleCharacter enemy)
        {
            if (_shieldIconRoot == null) return;
            foreach (Transform c in _shieldIconRoot) Destroy(c.gameObject);
            if (_shieldIconPrefab == null || enemy.MaxShields <= 0) return;

            for (int i = 0; i < enemy.MaxShields; i++)
            {
                var icon = Instantiate(_shieldIconPrefab, _shieldIconRoot);
                var img  = icon.GetComponent<Image>();
                if (img) img.color = i < enemy.CurrentShields
                    ? new Color(0.4f, 0.8f, 1f)
                    : new Color(0.25f, 0.25f, 0.3f);
            }
        }

        void RefreshStatusIcons(BattleCharacter enemy)
        {
            if (_statusIconRoot == null) return;
            foreach (Transform c in _statusIconRoot) Destroy(c.gameObject);
            if (_statusIconPrefab == null) return;

            foreach (var s in enemy.StatusEffects)
            {
                var icon = Instantiate(_statusIconPrefab, _statusIconRoot);
                var img  = icon.GetComponent<Image>();
                var txt  = icon.GetComponentInChildren<TextMeshProUGUI>();
                if (img) img.color = GetStatusColor(s.Type);
                if (txt) txt.text  = GetStatusAbbrev(s.Type);
                var tip = icon.AddComponent<TooltipTrigger>();
                tip.SetText(GetStatusName(s.Type), $"残り {s.RemainingTurns} ターン");
            }
        }

        static Color GetStatusColor(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => new Color(0.5f,  0.9f,  0.2f),
            StatusEffectType.Bleed     => new Color(0.9f,  0.15f, 0.15f),
            StatusEffectType.Burn      => new Color(1f,    0.45f, 0.1f),
            StatusEffectType.Freeze    => new Color(0.5f,  0.85f, 1f),
            StatusEffectType.Paralysis => new Color(1f,    0.9f,  0.1f),
            StatusEffectType.Sleep     => new Color(0.5f,  0.5f,  0.9f),
            StatusEffectType.Blind     => new Color(0.3f,  0.3f,  0.4f),
            StatusEffectType.Silence   => new Color(0.7f,  0.4f,  0.8f),
            StatusEffectType.AtkUp     => new Color(1f,    0.6f,  0.2f),
            StatusEffectType.AtkDown   => new Color(0.4f,  0.4f,  0.85f),
            StatusEffectType.DefUp     => new Color(0.3f,  0.65f, 1f),
            StatusEffectType.DefDown   => new Color(0.7f,  0.2f,  0.2f),
            StatusEffectType.SpdUp     => new Color(0.35f, 1f,    0.85f),
            StatusEffectType.SpdDown   => new Color(0.5f,  0.35f, 0.35f),
            StatusEffectType.Regen     => new Color(0.3f,  1f,    0.5f),
            _                          => Color.grey,
        };

        static string GetStatusAbbrev(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => "毒",
            StatusEffectType.Bleed     => "出血",
            StatusEffectType.Burn      => "炎",
            StatusEffectType.Freeze    => "氷",
            StatusEffectType.Paralysis => "麻",
            StatusEffectType.Sleep     => "眠",
            StatusEffectType.Blind     => "暗",
            StatusEffectType.Silence   => "沈",
            StatusEffectType.AtkUp     => "攻↑",
            StatusEffectType.AtkDown   => "攻↓",
            StatusEffectType.DefUp     => "防↑",
            StatusEffectType.DefDown   => "防↓",
            StatusEffectType.SpdUp     => "速↑",
            StatusEffectType.SpdDown   => "速↓",
            StatusEffectType.Regen     => "再生",
            _                          => t.ToString()[..2],
        };

        static string GetStatusName(StatusEffectType t) => t switch
        {
            StatusEffectType.Poison    => "毒",
            StatusEffectType.Bleed     => "出血",
            StatusEffectType.Burn      => "炎上",
            StatusEffectType.Freeze    => "凍結",
            StatusEffectType.Paralysis => "麻痺",
            StatusEffectType.Sleep     => "睡眠",
            StatusEffectType.Blind     => "暗闇",
            StatusEffectType.Silence   => "沈黙",
            StatusEffectType.AtkUp     => "攻撃力上昇",
            StatusEffectType.AtkDown   => "攻撃力低下",
            StatusEffectType.DefUp     => "防御力上昇",
            StatusEffectType.DefDown   => "防御力低下",
            StatusEffectType.SpdUp     => "速度上昇",
            StatusEffectType.SpdDown   => "速度低下",
            StatusEffectType.Regen     => "リジェネ",
            _                          => t.ToString(),
        };
    }

    // ── Turn Order Icon ───────────────────────────────────────────────────────
    public class TurnOrderIcon : MonoBehaviour
    {
        [SerializeField] Image            _portrait;
        [SerializeField] Image            _background;
        [SerializeField] Image            _border;
        [SerializeField] TextMeshProUGUI  _nameText;

        static readonly Color HeroColor    = new(0.15f, 0.35f, 0.75f, 0.85f);
        static readonly Color EnemyColor   = new(0.6f,  0.1f,  0.1f,  0.85f);
        static readonly Color ActiveBorder = new(1f,    0.85f, 0.2f,  1f);
        static readonly Color InactiveBorder = new(0.3f, 0.3f, 0.3f, 0.5f);

        public void Setup(BattleCharacter c, bool isNext)
        {
            if (_nameText)   _nameText.text  = c.DisplayName;
            if (_background) _background.color = c.IsPlayer ? HeroColor : EnemyColor;
            if (_border)     _border.color   = isNext ? ActiveBorder : InactiveBorder;

            // Portrait tint for status
            if (_portrait)
            {
                _portrait.color = c.IsAlive ? Color.white : new Color(0.4f, 0.4f, 0.4f, 0.5f);
                if (c.IsPlayer && c.CharData?.Portrait != null)
                    _portrait.sprite = c.CharData.Portrait;
                else if (!c.IsPlayer && c.EnemyData?.BattleSprite != null)
                    _portrait.sprite = c.EnemyData.BattleSprite;
            }
        }
    }
}
