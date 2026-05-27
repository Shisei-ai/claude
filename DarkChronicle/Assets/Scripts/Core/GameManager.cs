using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using DarkChronicle.Battle;
using DarkChronicle.Character;
using DarkChronicle.Data;

namespace DarkChronicle.Core
{
    /// <summary>
    /// Singleton game manager. Owns game state machine, scene transitions,
    /// party management, and save/load routing.
    /// </summary>
    public sealed class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        // ── Game State ─────────────────────────────────────────────────────
        public enum GameState { MainMenu, Field, Battle, Dialogue, Cutscene, Paused, GameOver }
        public GameState State { get; private set; } = GameState.MainMenu;

        // ── Party ──────────────────────────────────────────────────────────
        public List<CharacterRuntimeData> Party { get; private set; } = new();
        public const int MaxPartySize = 4;

        // ── World ──────────────────────────────────────────────────────────
        public string CurrentAreaName  { get; private set; }
        public int    Gold             { get; private set; } = 500;
        public int    PlaytimeSeconds  { get; private set; }

        // ── Scene Transition ───────────────────────────────────────────────
        [Header("Transition")]
        [SerializeField] CanvasGroup _transitionFade;
        [SerializeField] float       _fadeDuration = 0.5f;

        bool _isTransitioning;

        // ── Events ─────────────────────────────────────────────────────────
        public static event System.Action<GameState> OnStateChanged;

        // ── Unity ──────────────────────────────────────────────────────────
        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            BattleManager.OnBattleEnd += OnBattleEnd;
        }

        void Update()
        {
            if (State == GameState.Field || State == GameState.Battle)
                PlaytimeSeconds++;   // crude; replace with Time.unscaledDeltaTime accumulator
        }

        void OnDestroy() => BattleManager.OnBattleEnd -= OnBattleEnd;

        // ── State Machine ──────────────────────────────────────────────────
        public void SetState(GameState newState)
        {
            State = newState;
            OnStateChanged?.Invoke(State);

            switch (State)
            {
                case GameState.Field:
                    Time.timeScale = 1f;
                    break;
                case GameState.Paused:
                    Time.timeScale = 0f;
                    break;
                case GameState.Battle:
                    Time.timeScale = 1f;
                    break;
            }
        }

        // ── Scene Transitions ──────────────────────────────────────────────
        public void TransitionToScene(string sceneName, Vector3 spawnPosition = default, float delay = 0f)
        {
            if (_isTransitioning) return;
            StartCoroutine(TransitionCoroutine(sceneName, spawnPosition, delay));
        }

        IEnumerator TransitionCoroutine(string sceneName, Vector3 spawnPos, float delay)
        {
            _isTransitioning = true;
            yield return new WaitForSeconds(delay);
            yield return FadeOut();

            var asyncOp = SceneManager.LoadSceneAsync(sceneName);
            while (!asyncOp.isDone) yield return null;

            CurrentAreaName = sceneName;

            // Reposition player if spawn point given
            var player = FindObjectOfType<PlayerController>();
            if (player != null && spawnPos != default) player.TeleportTo(spawnPos);

            yield return FadeIn();
            _isTransitioning = false;
        }

        IEnumerator FadeOut() => FadeCanvas(0f, 1f);
        IEnumerator FadeIn()  => FadeCanvas(1f, 0f);

        IEnumerator FadeCanvas(float from, float to)
        {
            float elapsed = 0f;
            _transitionFade.alpha = from;
            _transitionFade.blocksRaycasts = true;
            while (elapsed < _fadeDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                _transitionFade.alpha = Mathf.Lerp(from, to, elapsed / _fadeDuration);
                yield return null;
            }
            _transitionFade.alpha = to;
            _transitionFade.blocksRaycasts = to > 0.5f;
        }

        // ── Battle Integration ─────────────────────────────────────────────
        public void StartBattle(List<EnemyData> enemies, bool ambush = false)
        {
            SetState(GameState.Battle);
            var heroDataList = new List<CharacterData>();
            var heroStatList = new List<CharacterStats>();
            foreach (var c in Party)
            {
                heroDataList.Add(c.BaseData);
                heroStatList.Add(c.RuntimeStats);
            }
            BattleManager.Instance.StartBattle(heroDataList, heroStatList, enemies);
        }

        void OnBattleEnd(BattleResult result)
        {
            switch (result)
            {
                case BattleResult.Victory:
                    // TODO: award EXP, gold, items
                    SetState(GameState.Field);
                    break;
                case BattleResult.Defeat:
                    StartCoroutine(GameOverSequence());
                    break;
                case BattleResult.Fled:
                    SetState(GameState.Field);
                    break;
            }
        }

        IEnumerator GameOverSequence()
        {
            SetState(GameState.GameOver);
            yield return FadeOut();
            SceneManager.LoadScene("GameOver");
        }

        // ── Party Management ───────────────────────────────────────────────
        public bool AddToParty(CharacterData data)
        {
            if (Party.Count >= MaxPartySize) return false;
            if (Party.Exists(c => c.BaseData == data)) return false;
            Party.Add(new CharacterRuntimeData(data));
            return true;
        }

        public void RemoveFromParty(CharacterData data) =>
            Party.RemoveAll(c => c.BaseData == data);

        // ── Economy ────────────────────────────────────────────────────────
        public bool SpendGold(int amount)
        {
            if (Gold < amount) return false;
            Gold -= amount;
            return true;
        }

        public void EarnGold(int amount) => Gold += amount;

        // ── Save / Load ────────────────────────────────────────────────────
        public void SaveGame(int slot) => SaveSystem.Save(BuildSaveData(), slot);

        public void LoadGame(int slot)
        {
            var data = SaveSystem.Load(slot);
            if (data == null) return;
            RestoreFromSave(data);
        }

        SaveData BuildSaveData() => new SaveData
        {
            SceneName      = CurrentAreaName,
            Gold           = Gold,
            PlaytimeSeconds = PlaytimeSeconds,
        };

        void RestoreFromSave(SaveData data)
        {
            Gold            = data.Gold;
            PlaytimeSeconds = data.PlaytimeSeconds;
            TransitionToScene(data.SceneName);
        }
    }

    // ── Runtime Character Data ─────────────────────────────────────────────
    public class CharacterRuntimeData
    {
        public CharacterData  BaseData     { get; }
        public CharacterStats RuntimeStats { get; set; }
        public int            Level        { get; set; } = 1;
        public int            CurrentHP    { get; set; }
        public int            CurrentMP    { get; set; }
        public int            Experience   { get; set; }
        public int            JobPoints    { get; set; }
        public JobData        CurrentJob   { get; set; }
        public int            JobLevel     { get; set; } = 1;

        public CharacterRuntimeData(CharacterData data)
        {
            BaseData     = data;
            RuntimeStats = data.BaseStats.Clone();
            CurrentJob   = data.StarterJob;
            CurrentHP    = RuntimeStats.MaxHP;
            CurrentMP    = RuntimeStats.MaxMP;
        }
    }

    // ── Save Data ──────────────────────────────────────────────────────────
    [System.Serializable]
    public class SaveData
    {
        public string SceneName;
        public int    Gold;
        public int    PlaytimeSeconds;
        // TODO: party state, flags, map position
    }

    // ── Save System (JSON) ─────────────────────────────────────────────────
    public static class SaveSystem
    {
        static string GetPath(int slot) =>
            System.IO.Path.Combine(Application.persistentDataPath, $"save_{slot:D2}.json");

        public static void Save(SaveData data, int slot)
        {
            string json = JsonUtility.ToJson(data, true);
            System.IO.File.WriteAllText(GetPath(slot), json);
        }

        public static SaveData Load(int slot)
        {
            string path = GetPath(slot);
            if (!System.IO.File.Exists(path)) return null;
            string json = System.IO.File.ReadAllText(path);
            return JsonUtility.FromJson<SaveData>(json);
        }
    }
}
