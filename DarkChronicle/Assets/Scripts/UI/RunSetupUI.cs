using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using DarkChronicle.Core;
using DarkChronicle.Data;
using DarkChronicle.Roguelike;
using DarkChronicle.Roguelike.Meta;

namespace DarkChronicle.UI
{
    /// <summary>
    /// ニューゲーム開始前の4ステップ準備シーン UI コントローラ。
    ///   Step 0: キャラクター選択
    ///   Step 1: 出発の祝福選択（3択ランダム）
    ///   Step 2: 難易度選択
    ///   Step 3: 確認・旅の始まり
    /// 決定後は PendingRunConfig に設定を書き込み Roguelike シーンへ遷移する。
    /// </summary>
    public sealed class RunSetupUI : MonoBehaviour
    {
        // ── Step 0 ─────────────────────────────────────────────────────────
        [Header("Step 0 – Character Select")]
        [SerializeField] CharacterData[] _characters;
        [SerializeField] CanvasGroup     _charPanel;
        [SerializeField] Transform       _charCardRoot;
        [SerializeField] Button          _charNextBtn;

        // ── Step 1 ─────────────────────────────────────────────────────────
        [Header("Step 1 – Blessing Select")]
        [SerializeField] CanvasGroup _blessPanel;
        [SerializeField] Transform   _blessCardRoot;
        [SerializeField] Button      _blessBackBtn;
        [SerializeField] Button      _blessNextBtn;

        // ── Step 2 ─────────────────────────────────────────────────────────
        [Header("Step 2 – Difficulty Select")]
        [SerializeField] CanvasGroup _diffPanel;
        [SerializeField] Transform   _diffCardRoot;
        [SerializeField] Button      _diffBackBtn;
        [SerializeField] Button      _diffNextBtn;

        // ── Step 3 ─────────────────────────────────────────────────────────
        [Header("Step 3 – Confirm")]
        [SerializeField] CanvasGroup         _confirmPanel;
        [SerializeField] Image               _confirmPortrait;
        [SerializeField] TextMeshProUGUI     _confirmCharName;
        [SerializeField] TextMeshProUGUI     _confirmJobName;
        [SerializeField] TextMeshProUGUI     _confirmDiffText;
        [SerializeField] TextMeshProUGUI     _confirmBlessText;
        [SerializeField] Button              _confirmBackBtn;
        [SerializeField] Button              _beginBtn;

        // ── Step Indicator ──────────────────────────────────────────────────
        [Header("Step Indicator")]
        [SerializeField] Image[] _stepDots;

        // ── Audio ───────────────────────────────────────────────────────────
        [Header("Audio")]
        [SerializeField] AudioSource _sfx;
        [SerializeField] AudioClip   _selectClip;
        [SerializeField] AudioClip   _pageClip;
        [SerializeField] AudioClip   _confirmClip;

        // ── Colors ──────────────────────────────────────────────────────────
        static readonly Color ColBg       = new(0.08f, 0.05f, 0.16f, 0.95f);
        static readonly Color ColBgDim    = new(0.04f, 0.03f, 0.08f, 0.80f);
        static readonly Color ColBgSelect = new(0.13f, 0.08f, 0.24f, 1.00f);
        static readonly Color ColGold     = new(0.78f, 0.60f, 0.20f, 1.00f);
        static readonly Color ColGoldDim  = new(0.38f, 0.28f, 0.10f, 1.00f);
        static readonly Color ColText     = new(0.93f, 0.88f, 0.78f, 1.00f);
        static readonly Color ColTextDim  = new(0.55f, 0.52f, 0.60f, 1.00f);
        static readonly Color ColGreen    = new(0.50f, 0.83f, 0.50f, 1.00f);
        static readonly Color ColDotOn    = new(0.78f, 0.60f, 0.20f, 1.00f);
        static readonly Color ColDotOff   = new(0.25f, 0.20f, 0.33f, 1.00f);

        // ── State ────────────────────────────────────────────────────────────
        CharacterData        _selectedChar;
        StartingBlessingType _selectedBlessing = StartingBlessingType.None;
        int                  _selectedDiff;
        int                  _currentStep;

        // ── Unity ────────────────────────────────────────────────────────────
        void Start()
        {
            _selectedDiff = Mathf.Clamp(
                MetaProgression.MaxUnlockedDifficulty, 0, DifficultyConfig.Tiers.Length - 1);

            SetPanel(_charPanel,    true,  instant: true);
            SetPanel(_blessPanel,   false, instant: true);
            SetPanel(_diffPanel,    false, instant: true);
            SetPanel(_confirmPanel, false, instant: true);

            _charNextBtn.onClick.AddListener(OnCharNext);
            _blessBackBtn.onClick.AddListener(() => GoTo(0));
            _blessNextBtn.onClick.AddListener(OnBlessNext);
            _diffBackBtn.onClick.AddListener(() => GoTo(1));
            _diffNextBtn.onClick.AddListener(OnDiffNext);
            _confirmBackBtn.onClick.AddListener(() => GoTo(2));
            _beginBtn.onClick.AddListener(OnBeginJourney);

            _charNextBtn.interactable  = false;
            _blessNextBtn.interactable = false;

            BuildCharCards();
            RefreshDots(0);
            StartCoroutine(FadeIn(_charPanel));
        }

        // ── Step 0: キャラクター選択 ──────────────────────────────────────────

        void BuildCharCards()
        {
            ClearChildren(_charCardRoot);
            if (_characters == null) return;
            foreach (var cd in _characters)
            {
                var card = MakeCharCard(cd);
                card.transform.SetParent(_charCardRoot, false);
            }
        }

        GameObject MakeCharCard(CharacterData cd)
        {
            const float W = 210f, H = 340f;
            var root = MakeCardRoot(cd.CharacterName, W, H);
            root.AddComponent<LayoutElement>().minWidth = W;

            // Portrait
            var port = MakeImg("Portrait", root.transform, cd.Portrait != null
                ? Color.white : cd.ThemeColor * 0.4f);
            if (cd.Portrait != null) port.GetComponent<Image>().sprite = cd.Portrait;
            StretchTop(port.GetComponent<RectTransform>(), -8f, 158f);

            // Theme bar
            var bar = MakeImg("Bar", root.transform, cd.ThemeColor);
            StretchTop(bar.GetComponent<RectTransform>(), -170f, 3f, 0f);

            // Name
            var nameGO = MakeTMP("Name", root.transform, cd.CharacterName, 18f,
                ColText, TextAlignmentOptions.Center, FontStyles.Bold);
            StretchTop(nameGO.GetComponent<RectTransform>(), -179f, 26f);

            // Job
            string job = cd.StarterJob != null ? cd.StarterJob.JobName : "—";
            var jobGO = MakeTMP("Job", root.transform, job, 12.5f,
                ColGold, TextAlignmentOptions.Center, FontStyles.Normal);
            StretchTop(jobGO.GetComponent<RectTransform>(), -208f, 20f);

            // HP
            var hpGO = MakeTMP("HP", root.transform, $"HP  {cd.BaseStats.MaxHP}", 11.5f,
                ColGreen, TextAlignmentOptions.Center, FontStyles.Normal);
            StretchTop(hpGO.GetComponent<RectTransform>(), -231f, 18f);

            // Backstory
            string bs = cd.Backstory ?? "";
            if (bs.Length > 44) bs = bs[..44] + "…";
            var bsGO = MakeTMP("Backstory", root.transform, bs, 10f,
                ColTextDim, TextAlignmentOptions.Center, FontStyles.Normal);
            var bsRT = bsGO.GetComponent<RectTransform>();
            StretchTop(bsRT, -253f, 54f);
            bsGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            // Selection overlay
            var selImg = MakeImg("SelFrame", root.transform, Color.clear);
            var selRT  = selImg.GetComponent<RectTransform>();
            selRT.anchorMin = Vector2.zero; selRT.anchorMax = Vector2.one;
            selRT.offsetMin = selRT.offsetMax = Vector2.zero;

            root.GetComponent<Button>().onClick.AddListener(() =>
            {
                PlaySFX(_selectClip);
                _selectedChar             = cd;
                _charNextBtn.interactable = true;
                HighlightCards(_charCardRoot, root,
                    ColBgSelect, new Color(cd.ThemeColor.r, cd.ThemeColor.g, cd.ThemeColor.b, 0.30f));
            });
            return root;
        }

        void OnCharNext()
        {
            if (_selectedChar == null) return;
            GoTo(1);
        }

        // ── Step 1: 祝福選択 ──────────────────────────────────────────────────

        void BuildBlessingCards()
        {
            ClearChildren(_blessCardRoot);
            _selectedBlessing      = StartingBlessingType.None;
            _blessNextBtn.interactable = false;

            var pool = new List<StartingBlessingType>
            {
                StartingBlessingType.VitalGuard,
                StartingBlessingType.GoldenCompass,
                StartingBlessingType.IronWill,
                StartingBlessingType.AncientKnowledge,
                StartingBlessingType.ShadowVeil,
            };
            Shuffle(pool);

            for (int i = 0; i < 3 && i < pool.Count; i++)
            {
                var card = MakeBlessingCard(pool[i]);
                card.transform.SetParent(_blessCardRoot, false);
            }
        }

        GameObject MakeBlessingCard(StartingBlessingType bt)
        {
            const float W = 280f, H = 300f;
            var (name, desc, icon) = PendingRunConfig.GetBlessingInfo(bt);

            var root = MakeCardRoot(name, W, H);
            root.AddComponent<LayoutElement>().minWidth = W;

            // Icon
            var iconGO = MakeTMP("Icon", root.transform, icon, 54f,
                ColGold, TextAlignmentOptions.Center, FontStyles.Normal);
            StretchTop(iconGO.GetComponent<RectTransform>(), -24f, 80f);

            // Name
            var nameGO = MakeTMP("Name", root.transform, name, 18f,
                ColText, TextAlignmentOptions.Center, FontStyles.Bold);
            StretchTop(nameGO.GetComponent<RectTransform>(), -114f, 28f);

            // Divider
            var div = MakeImg("Div", root.transform, new Color(0.30f, 0.22f, 0.42f));
            StretchTop(div.GetComponent<RectTransform>(), -147f, 1f, 20f);

            // Desc
            var descGO = MakeTMP("Desc", root.transform, desc, 12f,
                ColTextDim, TextAlignmentOptions.Center, FontStyles.Normal);
            StretchTop(descGO.GetComponent<RectTransform>(), -156f, 70f, 12f);
            descGO.GetComponent<TextMeshProUGUI>().enableWordWrapping = true;

            // Selection overlay
            var selImg = MakeImg("SelFrame", root.transform, Color.clear);
            var selRT  = selImg.GetComponent<RectTransform>();
            selRT.anchorMin = Vector2.zero; selRT.anchorMax = Vector2.one;
            selRT.offsetMin = selRT.offsetMax = Vector2.zero;

            root.GetComponent<Button>().onClick.AddListener(() =>
            {
                PlaySFX(_selectClip);
                _selectedBlessing          = bt;
                _blessNextBtn.interactable = true;
                HighlightCards(_blessCardRoot, root,
                    ColBgSelect, new Color(0.78f, 0.60f, 0.20f, 0.28f));
            });
            return root;
        }

        void OnBlessNext()
        {
            if (_selectedBlessing == StartingBlessingType.None) return;
            GoTo(2);
        }

        // ── Step 2: 難易度選択 ────────────────────────────────────────────────

        void BuildDiffCards()
        {
            ClearChildren(_diffCardRoot);

            int maxSel = Mathf.Min(
                MetaProgression.MaxUnlockedDifficulty + 1,
                DifficultyConfig.Tiers.Length - 1);

            for (int i = 0; i < DifficultyConfig.Tiers.Length; i++)
            {
                bool locked = i > maxSel;
                var card    = MakeDiffCard(DifficultyConfig.Tiers[i], locked, i);
                card.transform.SetParent(_diffCardRoot, false);
            }
            _diffNextBtn.interactable = true;
            HighlightDiffCards(_selectedDiff);
        }

        GameObject MakeDiffCard(DifficultyTier tier, bool locked, int idx)
        {
            const float W = 520f, H = 64f;

            var root = new GameObject($"Diff{idx}");
            var rt   = root.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(W, H);
            var img  = root.AddComponent<Image>();
            img.color = locked ? ColBgDim : ColBg;
            var btn  = root.AddComponent<Button>();
            btn.targetGraphic = img;
            btn.interactable  = !locked;
            var nav = btn.navigation; nav.mode = Navigation.Mode.None; btn.navigation = nav;
            var le  = root.AddComponent<LayoutElement>();
            le.minWidth = W; le.minHeight = H;

            Color nameCol = locked ? ColTextDim : ColText;
            var nameGO = MakeTMP("Name", root.transform,
                $"【{idx}】 {tier.DisplayName}", 16f, nameCol, TextAlignmentOptions.MidlineLeft, FontStyles.Normal);
            var nrt = nameGO.GetComponent<RectTransform>();
            nrt.anchorMin = new Vector2(0, 0); nrt.anchorMax = new Vector2(0.55f, 1f);
            nrt.offsetMin = new Vector2(18, 0); nrt.offsetMax = Vector2.zero;

            string modStr = locked
                ? "🔒 LOCKED"
                : $"敵HP×{tier.EnemyHPMult:F2}  攻撃×{tier.EnemyDamageMult:F2}  G+{tier.StartingGold}";
            Color modCol = locked ? new Color(0.22f, 0.20f, 0.26f) : ColGoldDim;
            var modGO = MakeTMP("Mod", root.transform, modStr, 11f, modCol,
                TextAlignmentOptions.MidlineRight, FontStyles.Normal);
            var mrt = modGO.GetComponent<RectTransform>();
            mrt.anchorMin = new Vector2(0.55f, 0); mrt.anchorMax = new Vector2(1f, 1f);
            mrt.offsetMin = Vector2.zero; mrt.offsetMax = new Vector2(-14, 0);

            var selImg = MakeImg("SelFrame", root.transform, Color.clear);
            var selRT  = selImg.GetComponent<RectTransform>();
            selRT.anchorMin = Vector2.zero; selRT.anchorMax = Vector2.one;
            selRT.offsetMin = selRT.offsetMax = Vector2.zero;

            if (!locked)
            {
                btn.onClick.AddListener(() =>
                {
                    PlaySFX(_selectClip);
                    _selectedDiff             = idx;
                    _diffNextBtn.interactable = true;
                    HighlightDiffCards(idx);
                });
            }
            return root;
        }

        void HighlightDiffCards(int sel)
        {
            int i = 0;
            foreach (Transform child in _diffCardRoot)
            {
                bool mine = i == sel;
                SetCardHighlight(child, mine ? ColBgSelect : ColBg,
                    mine ? new Color(0.78f, 0.60f, 0.20f, 0.22f) : Color.clear);
                i++;
            }
        }

        void OnDiffNext()
        {
            RefreshConfirmPanel();
            GoTo(3);
        }

        // ── Step 3: 確認 ─────────────────────────────────────────────────────

        void RefreshConfirmPanel()
        {
            if (_confirmCharName != null)
                _confirmCharName.text = _selectedChar?.CharacterName ?? "—";
            if (_confirmJobName != null)
                _confirmJobName.text = _selectedChar?.StarterJob?.JobName ?? "—";

            if (_confirmPortrait != null && _selectedChar != null)
            {
                if (_selectedChar.Portrait != null)
                    _confirmPortrait.sprite = _selectedChar.Portrait;
                else
                    _confirmPortrait.color = _selectedChar.ThemeColor * 0.6f;
            }

            var tier = DifficultyConfig.Get(_selectedDiff);
            if (_confirmDiffText != null)
                _confirmDiffText.text = $"難易度:  【{_selectedDiff}】{tier.DisplayName}";

            var (blessName, _, _) = PendingRunConfig.GetBlessingInfo(_selectedBlessing);
            if (_confirmBlessText != null)
                _confirmBlessText.text = $"祝福:      {blessName}";
        }

        void OnBeginJourney()
        {
            if (_selectedChar == null) return;
            PlaySFX(_confirmClip);
            PendingRunConfig.Set(_selectedChar, _selectedDiff, _selectedBlessing);
            RoguelikeManager.ForceNewRun = true;
            SceneManager.LoadScene(SceneNames.Roguelike);
        }

        // ── ステップ遷移 ──────────────────────────────────────────────────────

        void GoTo(int next)
        {
            if (next == _currentStep) return;
            PlaySFX(_pageClip);
            StartCoroutine(DoTransition(next));
        }

        IEnumerator DoTransition(int next)
        {
            var panels = new[] { _charPanel, _blessPanel, _diffPanel, _confirmPanel };
            yield return FadeOut(panels[_currentStep]);

            if (next == 1) BuildBlessingCards();
            else if (next == 2) BuildDiffCards();

            _currentStep = next;
            RefreshDots(next);
            yield return FadeIn(panels[next]);
        }

        void RefreshDots(int active)
        {
            if (_stepDots == null) return;
            for (int i = 0; i < _stepDots.Length; i++)
                _stepDots[i].color = i == active ? ColDotOn : ColDotOff;
        }

        // ── カードハイライト ──────────────────────────────────────────────────

        static void HighlightCards(Transform container, GameObject selected,
            Color bgSel, Color overlaySel)
        {
            foreach (Transform child in container)
            {
                bool mine = child.gameObject == selected;
                SetCardHighlight(child, mine ? bgSel : ColBg, mine ? overlaySel : Color.clear);
            }
        }

        static void SetCardHighlight(Transform card, Color bg, Color overlay)
        {
            var img = card.GetComponent<Image>();
            if (img != null) img.color = bg;
            var frame = card.Find("SelFrame");
            if (frame != null)
            {
                var fi = frame.GetComponent<Image>();
                if (fi != null) fi.color = overlay;
            }
        }

        // ── Fade ────────────────────────────────────────────────────────────

        static void SetPanel(CanvasGroup g, bool visible, bool instant = false)
        {
            g.alpha          = visible ? 1f : 0f;
            g.blocksRaycasts = visible;
            g.interactable   = visible;
        }

        IEnumerator FadeIn(CanvasGroup g, float dur = 0.30f)
        {
            g.blocksRaycasts = g.interactable = true;
            for (float t = 0f; t < dur; t += Time.deltaTime)
            {
                g.alpha = t / dur;
                yield return null;
            }
            g.alpha = 1f;
        }

        IEnumerator FadeOut(CanvasGroup g, float dur = 0.20f)
        {
            g.blocksRaycasts = g.interactable = false;
            for (float t = 0f; t < dur; t += Time.deltaTime)
            {
                g.alpha = 1f - t / dur;
                yield return null;
            }
            g.alpha = 0f;
        }

        // ── Audio ─────────────────────────────────────────────────────────────

        void PlaySFX(AudioClip clip)
        {
            if (_sfx != null && clip != null) _sfx.PlayOneShot(clip);
        }

        // ── UI ファクトリ ─────────────────────────────────────────────────────

        static GameObject MakeCardRoot(string name, float w, float h)
        {
            var go  = new GameObject(name);
            var rt  = go.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(w, h);
            var img = go.AddComponent<Image>();
            img.color = ColBg;
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            var nav = btn.navigation; nav.mode = Navigation.Mode.None; btn.navigation = nav;
            return go;
        }

        static GameObject MakeImg(string name, Transform parent, Color color)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<Image>().color = color;
            return go;
        }

        static GameObject MakeTMP(string name, Transform parent, string text,
            float size, Color color, TextAlignmentOptions align, FontStyles style)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            var t   = go.AddComponent<TextMeshProUGUI>();
            t.text               = text;
            t.fontSize           = size;
            t.color              = color;
            t.alignment          = align;
            t.fontStyle          = style;
            t.enableWordWrapping = false;
            t.overflowMode       = TextOverflowModes.Ellipsis;
            return go;
        }

        // 親の上端から yOffset だけ下に配置（全幅ストレッチ）
        static void StretchTop(RectTransform rt, float yOffset, float height, float xMargin = 8f)
        {
            rt.anchorMin        = new Vector2(0, 1);
            rt.anchorMax        = new Vector2(1, 1);
            rt.pivot            = new Vector2(0.5f, 1f);
            rt.anchoredPosition = new Vector2(0, yOffset);
            rt.sizeDelta        = new Vector2(-xMargin * 2f, height);
        }

        static void ClearChildren(Transform t)
        {
            foreach (Transform c in t) Destroy(c.gameObject);
        }

        static void Shuffle<T>(List<T> list)
        {
            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }
        }
    }
}
