using System.Collections;
using System.Collections.Generic;
using System.Linq;
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
            var player = FindAnyObjectByType<PlayerController>();
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
            var heroSkills   = new List<List<SkillData>>();
            foreach (var c in Party)
            {
                heroDataList.Add(c.BaseData);
                heroStatList.Add(c.RuntimeStats);
                heroSkills.Add(
                    c.CurrentJob?.LearnableSkills
                        ?.Where(e => e.Skill != null && e.JobLevel <= c.JobLevel)
                         .Select(e => e.Skill).ToList()
                    ?? new List<SkillData>());
            }
            BattleManager.Instance.StartBattle(heroDataList, heroStatList, enemies,
                                               heroSkills: heroSkills);
        }

        void OnBattleEnd(BattleResult result)
        {
            switch (result)
            {
                case BattleResult.Victory:
                    AwardBattleRewards(BattleManager.Instance.VictoryEnemyData);
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
            SceneManager.LoadScene(SceneNames.GameOver);
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

        // ── Battle Rewards ─────────────────────────────────────────────────
        void AwardBattleRewards(List<EnemyData> enemies)
        {
            if (enemies == null || enemies.Count == 0) return;

            int totalExp  = enemies.Sum(e => e?.ExpReward  ?? 0);
            int totalJP   = enemies.Sum(e => e?.JPReward   ?? 0);
            int totalGold = enemies.Sum(e => e?.GoldReward ?? 0);

            EarnGold(totalGold);

            foreach (var member in Party)
            {
                if (member.CurrentHP <= 0) continue;   // KO'd members gain nothing

                // EXP — level ups
                member.Experience += totalExp;
                while (member.Level < 50)
                {
                    int needed = 80 + 20 * member.Level * member.Level;
                    if (member.Experience < needed) break;
                    member.Experience -= needed;
                    member.Level++;

                    var g = member.CurrentJob?.GrowthRates;
                    if (g != null)
                    {
                        member.RuntimeStats.MaxHP           += g.MaxHP;
                        member.RuntimeStats.MaxMP           += g.MaxMP;
                        member.RuntimeStats.PhysicalAttack  += g.PhysicalAttack;
                        member.RuntimeStats.MagicAttack     += g.MagicAttack;
                        member.RuntimeStats.PhysicalDefense += g.PhysicalDefense;
                        member.RuntimeStats.MagicDefense    += g.MagicDefense;
                        member.RuntimeStats.Speed           += g.Speed;
                        member.RuntimeStats.Luck            += g.Luck;
                        member.RuntimeStats.CriticalRate    += g.CriticalRate;
                        member.CurrentHP = Mathf.Min(member.CurrentHP + g.MaxHP, member.RuntimeStats.MaxHP);
                    }
                }

                // JP — job level ups
                member.JobPoints += totalJP;
                while (member.JobLevel < 10)
                {
                    int needed = 50 * member.JobLevel;
                    if (member.JobPoints < needed) break;
                    member.JobPoints -= needed;
                    member.JobLevel++;
                }
            }
        }

        // ── Save / Load ────────────────────────────────────────────────────
        public void SaveGame(int slot) => SaveSystem.Save(BuildSaveData(), slot);

        public void LoadGame(int slot)
        {
            var data = SaveSystem.Load(slot);
            if (data == null) return;
            RestoreFromSave(data);
        }

        SaveData BuildSaveData()
        {
            var save = new SaveData
            {
                SceneName       = CurrentAreaName,
                Gold            = Gold,
                PlaytimeSeconds = PlaytimeSeconds,
            };

            var player = FindAnyObjectByType<PlayerController>();
            if (player != null)
            {
                save.PlayerPosX = player.transform.position.x;
                save.PlayerPosY = player.transform.position.y;
                save.PlayerPosZ = player.transform.position.z;
            }

            foreach (var m in Party)
            {
                save.Party.Add(new PartyMemberSaveData
                {
                    CharacterName = m.BaseData.CharacterName,
                    Level         = m.Level,
                    Experience    = m.Experience,
                    JobLevel      = m.JobLevel,
                    JobPoints     = m.JobPoints,
                    CurrentHP     = m.CurrentHP,
                    CurrentMP     = m.CurrentMP,
                });
            }

            return save;
        }

        void RestoreFromSave(SaveData data)
        {
            Gold            = data.Gold;
            PlaytimeSeconds = data.PlaytimeSeconds;

            // Restore saved numeric fields into already-loaded party members (matched by name)
            foreach (var saved in data.Party)
            {
                var member = Party.Find(m => m.BaseData.CharacterName == saved.CharacterName);
                if (member == null) continue;
                member.Level      = saved.Level;
                member.Experience = saved.Experience;
                member.JobLevel   = saved.JobLevel;
                member.JobPoints  = saved.JobPoints;
                member.CurrentHP  = Mathf.Clamp(saved.CurrentHP, 1, member.RuntimeStats.MaxHP);
                member.CurrentMP  = Mathf.Clamp(saved.CurrentMP, 0, member.RuntimeStats.MaxMP);
            }

            TransitionToScene(data.SceneName,
                new Vector3(data.PlayerPosX, data.PlayerPosY, data.PlayerPosZ));
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
    public class PartyMemberSaveData
    {
        public string CharacterName;
        public int    Level;
        public int    Experience;
        public int    JobLevel;
        public int    JobPoints;
        public int    CurrentHP;
        public int    CurrentMP;
    }

    [System.Serializable]
    public class SaveData
    {
        public string SceneName;
        public int    Gold;
        public int    PlaytimeSeconds;
        public float  PlayerPosX;
        public float  PlayerPosY;
        public float  PlayerPosZ;
        public List<PartyMemberSaveData> Party = new();
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
