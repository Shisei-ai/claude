using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace DarkChronicle.UI
{
    /// <summary>
    /// Visual Novel-style dialogue system with typewriter effect, speaker portraits,
    /// branch choices, and voice line audio support.
    /// </summary>
    public sealed class DialogueSystem : MonoBehaviour
    {
        public static DialogueSystem Instance { get; private set; }

        // ── UI References ──────────────────────────────────────────────────
        [Header("Dialogue Box")]
        [SerializeField] CanvasGroup    _dialogueGroup;
        [SerializeField] TextMeshProUGUI _speakerNameText;
        [SerializeField] TextMeshProUGUI _bodyText;
        [SerializeField] Image          _advanceIndicator;

        [Header("Portrait")]
        [SerializeField] Image          _leftPortrait;
        [SerializeField] Image          _rightPortrait;
        [SerializeField] CanvasGroup    _leftGroup;
        [SerializeField] CanvasGroup    _rightGroup;

        [Header("Choice Panel")]
        [SerializeField] GameObject     _choicePanel;
        [SerializeField] Transform      _choiceContent;
        [SerializeField] GameObject     _choiceButtonPrefab;

        [Header("Typewriter")]
        [SerializeField] float          _typewriterSpeed  = 40f;    // chars per second
        [SerializeField] AudioClip      _typewriterBlip;
        [SerializeField] int            _blipInterval     = 3;      // blip every N chars

        // ── State ──────────────────────────────────────────────────────────
        bool    _isOpen;
        bool    _isTyping;
        bool    _skipRequested;
        int     _choiceResult = -1;
        Coroutine _typeCoroutine;

        AudioSource _audioSource;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            Instance      = this;
            _audioSource  = gameObject.AddComponent<AudioSource>();
            _audioSource.playOnAwake = false;
            _dialogueGroup.alpha     = 0f;
            _dialogueGroup.blocksRaycasts = false;
            _choicePanel.SetActive(false);
        }

        void Update()
        {
            if (_isOpen && (Input.GetKeyDown(KeyCode.Z)
                         || Input.GetKeyDown(KeyCode.Return)
                         || Input.GetKeyDown(KeyCode.Space)))
            {
                if (_isTyping) _skipRequested = true;
            }
        }

        // ── Public API ─────────────────────────────────────────────────────
        public IEnumerator PlayDialogue(DialogueSequence sequence)
        {
            yield return OpenDialogue();

            foreach (var line in sequence.Lines)
            {
                yield return DisplayLine(line);
                // Wait for advance input (not typing)
                yield return WaitForAdvance();
            }

            if (sequence.Choices != null && sequence.Choices.Count > 0)
                yield return ShowChoices(sequence.Choices);

            yield return CloseDialogue();
        }

        public IEnumerator PlaySingleLine(string speaker, string body, Sprite portrait = null)
        {
            yield return OpenDialogue();
            var line = new DialogueLine { SpeakerName = speaker, Body = body };
            if (portrait != null) { line.SpeakerPortrait = portrait; line.PortraitSide = PortraitSide.Left; }
            yield return DisplayLine(line);
            yield return WaitForAdvance();
            yield return CloseDialogue();
        }

        // ── Core ───────────────────────────────────────────────────────────
        IEnumerator OpenDialogue()
        {
            _isOpen = true;
            _dialogueGroup.blocksRaycasts = true;
            yield return FadeCanvasGroup(_dialogueGroup, 0f, 1f, 0.25f);
        }

        IEnumerator CloseDialogue()
        {
            _choicePanel.SetActive(false);
            yield return FadeCanvasGroup(_dialogueGroup, 1f, 0f, 0.2f);
            _dialogueGroup.blocksRaycasts = false;
            _isOpen = false;
        }

        IEnumerator DisplayLine(DialogueLine line)
        {
            // Speaker name
            _speakerNameText.text = line.SpeakerName ?? string.Empty;

            // Portrait
            SetPortrait(line.PortraitSide, line.SpeakerPortrait, line.Expression);

            // Typewriter
            _bodyText.text = string.Empty;
            _advanceIndicator.enabled = false;
            _skipRequested = false;
            _isTyping = true;

            _typeCoroutine = StartCoroutine(TypewriterEffect(line.Body));
            yield return _typeCoroutine;

            _isTyping = false;
            _advanceIndicator.enabled = true;

            // Voice line
            if (line.VoiceClip != null)
            {
                _audioSource.clip = line.VoiceClip;
                _audioSource.Play();
            }
        }

        IEnumerator TypewriterEffect(string fullText)
        {
            float secPerChar = 1f / _typewriterSpeed;
            int blipCount    = 0;

            for (int i = 0; i <= fullText.Length; i++)
            {
                if (_skipRequested)
                {
                    _bodyText.text = fullText;
                    break;
                }

                _bodyText.text = fullText[..i];

                // Rich text: don't count tags as typed characters
                if (i < fullText.Length && fullText[i] == '<')
                {
                    int closeIdx = fullText.IndexOf('>', i);
                    if (closeIdx > i) { i = closeIdx; _bodyText.text = fullText[..i]; continue; }
                }

                blipCount++;
                if (blipCount % _blipInterval == 0 && _typewriterBlip != null)
                    _audioSource.PlayOneShot(_typewriterBlip, 0.3f);

                yield return new WaitForSeconds(secPerChar);
            }
        }

        IEnumerator WaitForAdvance()
        {
            // Already skipped while typing = auto-advance
            if (_skipRequested) { _skipRequested = false; yield break; }

            bool advanced = false;
            while (!advanced)
            {
                if (Input.GetKeyDown(KeyCode.Z) || Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.Space))
                    advanced = true;
                yield return null;
            }
        }

        IEnumerator ShowChoices(List<DialogueChoice> choices)
        {
            _choicePanel.SetActive(true);
            foreach (Transform child in _choiceContent) Destroy(child.gameObject);

            for (int i = 0; i < choices.Count; i++)
            {
                int idx = i;
                var btn = Instantiate(_choiceButtonPrefab, _choiceContent);
                var txt = btn.GetComponentInChildren<TextMeshProUGUI>();
                if (txt) txt.text = choices[i].Text;
                btn.GetComponent<Button>().onClick.AddListener(() => { _choiceResult = idx; });
            }

            _choiceResult = -1;
            while (_choiceResult < 0) yield return null;

            _choicePanel.SetActive(false);

            // Execute branch callback
            choices[_choiceResult].OnSelected?.Invoke();
        }

        void SetPortrait(PortraitSide side, Sprite portrait, string expression)
        {
            bool hasPortrait = portrait != null;

            if (side == PortraitSide.Left || side == PortraitSide.Both)
            {
                _leftPortrait.sprite   = portrait;
                _leftGroup.alpha       = hasPortrait ? 1f : 0f;
                _rightGroup.alpha      = 0.5f;  // dim when left is active
            }
            else if (side == PortraitSide.Right)
            {
                _rightPortrait.sprite  = portrait;
                _rightGroup.alpha      = hasPortrait ? 1f : 0f;
                _leftGroup.alpha       = 0.5f;
            }
            else
            {
                _leftGroup.alpha  = 1f;
                _rightGroup.alpha = 1f;
            }
        }

        IEnumerator FadeCanvasGroup(CanvasGroup group, float from, float to, float duration)
        {
            float elapsed = 0f;
            group.alpha   = from;
            while (elapsed < duration)
            {
                elapsed    += Time.deltaTime;
                group.alpha = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            group.alpha = to;
        }
    }

    // ── Data Types ─────────────────────────────────────────────────────────
    [System.Serializable]
    public class DialogueSequence
    {
        public string               SequenceID;
        public List<DialogueLine>   Lines   = new();
        public List<DialogueChoice> Choices;   // null = no branch
    }

    [System.Serializable]
    public class DialogueLine
    {
        public string       SpeakerName;
        public Sprite       SpeakerPortrait;
        public PortraitSide PortraitSide = PortraitSide.Left;
        public string       Expression;         // e.g. "Angry", "Sad"
        [TextArea]
        public string       Body;
        public AudioClip    VoiceClip;
        public float        DisplayDuration = 0f;  // 0 = wait for input
    }

    [System.Serializable]
    public class DialogueChoice
    {
        public string                   Text;
        public System.Action            OnSelected;
        public string                   LeadsToSequenceID;
    }

    public enum PortraitSide { None, Left, Right, Both }
}
