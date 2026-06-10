/* =====================================================
   MONSTER CATCHER — CORE
===================================================== */

const SAVE_KEY = "monster_catcher_v2";
const TOTAL_SPECIES = 25;

const gameState = {

    data: null,
    currentMonster: null,
    shiny: false,
    encounterActive: false,
    mathEnabled: false,

    energy: 0,
    energyRequired: 1,

    temper: 0,

    streak: 0,
    bestStreak: 0,

    xp: 0,
    rank: "Novice",

    stats: {
        encounters: 0,
        catches: 0,
        escapes: 0,
        shinies: 0,
        criticals: 0,
        rareSeen: 0,
        legendarySeen: 0
    },

    collection: [],
    shinyCollection: [],
    achievements: [],

    settings: {
        sound: true,
        music: false
    }
};

const UI = {};
let currentQuestion = null;
let temperInterval = null;
let audioContext = null;

/* =====================================================
   DOM CACHE
===================================================== */

function cacheDOM()
{
    UI.monsterName = document.getElementById("monsterName");
    UI.monsterRarity = document.getElementById("monsterRarity");
    UI.monsterBiome = document.getElementById("monsterBiome");
    UI.monsterSprite = document.getElementById("monsterSprite");
    UI.shinySparkles = document.getElementById("shinySparkles");
    UI.timerBar = document.getElementById("timerBarInner");
    UI.timerText = document.getElementById("timerText");
    UI.timerLabel = document.getElementById("timerLabel");
    UI.question = document.getElementById("mathQuestion");
    UI.answer = document.getElementById("mathAnswer");
    UI.submit = document.getElementById("submitAnswer");
    UI.orbChargePercent = document.getElementById("orbChargePercent");
    UI.catchChancePercent = document.getElementById("catchChancePercent");
    UI.orbChargeBar = document.getElementById("orbChargeBarInner");
    UI.caughtCount = document.getElementById("caughtCount");
    UI.speciesCount = document.getElementById("speciesCount");
    UI.collectionPercent = document.getElementById("collectionPercent");
    UI.shinyCount = document.getElementById("shinyCount");
    UI.combo = document.getElementById("comboCount");
    UI.bestCombo = document.getElementById("bestCombo");
    UI.biome = document.getElementById("biomeBackground");
    UI.flashOverlay = document.getElementById("flashOverlay");
    UI.rareBanner = document.getElementById("rareEncounterBanner");
    UI.legendaryBanner = document.getElementById("legendaryEncounterBanner");
    UI.captureBanner = document.getElementById("captureFeedbackBanner");
    UI.shinyBanner = document.getElementById("shinyBanner");
    
    // Mini-bars & Journal modal caching
    UI.speciesBar = document.getElementById("speciesBarInner");
    UI.collectionBar = document.getElementById("collectionBarInner");
    UI.journalProgressBar = document.getElementById("journalProgressBarInner");
    UI.journalProgressText = document.getElementById("journalProgressText");
}

/* =====================================================
   SAVE
===================================================== */

function saveGame()
{
    try
    {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
    catch(error)
    {
        console.error("Save Failed", error);
    }
}

function loadGame()
{
    try
    {
        const raw = localStorage.getItem(SAVE_KEY);

        if(!raw)
        {
            return;
        }

        const save = JSON.parse(raw);
        Object.assign(gameState, save);

        if(!gameState.stats.rareSeen)
        {
            gameState.stats.rareSeen = 0;
        }

        if(!gameState.stats.legendarySeen)
        {
            gameState.stats.legendarySeen = 0;
        }

        if(!gameState.shinyCollection)
        {
            gameState.shinyCollection = [];
        }
    }
    catch(error)
    {
        console.error("Load Failed", error);
    }
}

/* =====================================================
   DATA
===================================================== */

async function loadMonsterData()
{
    const response = await fetch("monsters.json");

    if(!response.ok)
    {
        throw new Error("Cannot load monsters.json");
    }

    gameState.data = await response.json();
}

/* =====================================================
   UTILS
===================================================== */

function random(min, max)
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getTotalSpecies()
{
    return gameState.data?.monsters?.length || TOTAL_SPECIES;
}

/* =====================================================
   RARITY ROLL — 75% / 20% / 5%
===================================================== */

function rollRarity()
{
    const rarities = gameState.data.rarities;
    const roll = Math.random() * 100;
    let current = 0;

    for(const rarity in rarities)
    {
        current += rarities[rarity].spawnWeight;

        if(roll <= current)
        {
            return rarity;
        }
    }

    return "Common";
}

function getMonster()
{
    const rarity = rollRarity();

    const pool = gameState.data.monsters.filter(
        monster => monster.rarity === rarity
    );

    if(pool.length === 0)
    {
        return gameState.data.monsters[0];
    }

    return pool[random(0, pool.length - 1)];
}

/* =====================================================
   SHINY — 2% chance; only Starveil has real shiny art
===================================================== */

function rollShiny()
{
    return Math.random() < 0.02;
}

function getMonsterSprite(monster, shiny)
{
    if(shiny && monster.shinySprite)
    {
        return monster.shinySprite;
    }

    return monster.sprite;
}

function getShinyFilter(monsterId)
{
    const filters = {
        spriggle: "hue-rotate(90deg) saturate(1.8) brightness(1.1)",
        pebblit: "hue-rotate(180deg) saturate(2) brightness(1.2)",
        fizzbug: "hue-rotate(240deg) saturate(1.5) brightness(1.3)",
        leafroo: "hue-rotate(300deg) saturate(1.7) brightness(1.15)",
        puffinx: "hue-rotate(60deg) saturate(2) brightness(1.2)",
        bramblet: "hue-rotate(150deg) saturate(1.6) brightness(1.1)",
        glowlet: "hue-rotate(280deg) saturate(2) brightness(1.4)",
        droplet: "hue-rotate(320deg) saturate(1.8) brightness(1.3)",
        mossnap: "hue-rotate(45deg) saturate(1.8) brightness(1.2)",
        chirplet: "hue-rotate(200deg) saturate(1.8) brightness(1.25)",
        
        aquava: "hue-rotate(270deg) saturate(1.6) brightness(1.2)",
        bloomhorn: "hue-rotate(80deg) saturate(1.9) brightness(1.1)",
        cragoon: "hue-rotate(130deg) saturate(2) brightness(1.15)",
        emberjaw: "hue-rotate(180deg) saturate(2) brightness(1.2)",
        frostwing: "hue-rotate(60deg) saturate(1.8) brightness(1.3)",
        lumibun: "hue-rotate(100deg) saturate(2) brightness(1.35)",
        stormcub: "hue-rotate(220deg) saturate(2) brightness(1.25)",
        thornox: "hue-rotate(340deg) saturate(1.7) brightness(1.1)",
        
        aetherion: "hue-rotate(60deg) saturate(2.2) brightness(1.3)",
        lunaris: "hue-rotate(160deg) saturate(1.8) brightness(1.4)",
        pyroclast: "hue-rotate(240deg) saturate(2) brightness(1.25)",
        solarax: "hue-rotate(140deg) saturate(2) brightness(1.3)",
        tempestra: "hue-rotate(300deg) saturate(1.8) brightness(1.2)",
        verdantor: "hue-rotate(200deg) saturate(1.7) brightness(1.15)"
    };
    
    return filters[monsterId] || "hue-rotate(120deg) saturate(1.5) brightness(1.2)";
}

function applyShinyVisuals(shiny)
{
    UI.monsterSprite.classList.remove("shiny-monster-shadow", "monster-shake");
    UI.monsterSprite.style.filter = "";

    if(UI.shinySparkles)
    {
        UI.shinySparkles.classList.remove("active");
        UI.shinySparkles.innerHTML = "";
    }

    if(!shiny)
    {
        return;
    }

    // Always add the sparkles and the shiny shadow
    UI.monsterSprite.classList.add("shiny-monster-shadow");

    const monster = gameState.currentMonster;
    if (monster && monster.id !== "starveil")
    {
        UI.monsterSprite.style.filter = getShinyFilter(monster.id) + " drop-shadow(0 0 22px gold) drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))";
    }
    else
    {
        UI.monsterSprite.style.filter = "drop-shadow(0 0 22px gold) drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))";
    }

    if(UI.shinySparkles)
    {
        UI.shinySparkles.classList.add("active");

        const positions = [
            { top: "10%", left: "25%" },
            { top: "20%", right: "20%" },
            { bottom: "25%", left: "30%" },
            { bottom: "15%", right: "28%" }
        ];

        positions.forEach((pos, i) =>
        {
            const spark = document.createElement("span");
            spark.className = "sparkle-particle";
            Object.assign(spark.style, pos);
            spark.style.animationDelay = (i * 0.3) + "s";
            UI.shinySparkles.appendChild(spark);
        });
    }
}

/* =====================================================
   BIOME
===================================================== */

function setBiome(name)
{
    UI.biome.className = "";
    UI.biome.classList.add("biome-" + name.toLowerCase());
}

/* =====================================================
   HUD
===================================================== */

function updateHUD()
{
    const total = getTotalSpecies();
    const species = gameState.collection.length;
    const percent = Math.round((species / total) * 100);

    UI.caughtCount.textContent = gameState.stats.catches;
    UI.speciesCount.textContent = species + " / " + total;
    UI.collectionPercent.textContent = percent + "%";
    UI.shinyCount.textContent = gameState.stats.shinies;
    UI.combo.textContent = "x" + gameState.streak;
    UI.bestCombo.textContent = gameState.bestStreak;

    // Update species and collection progress bars
    if (UI.speciesBar) {
        UI.speciesBar.style.width = percent + "%";
    }
    if (UI.collectionBar) {
        UI.collectionBar.style.width = percent + "%";
    }
    if (UI.journalProgressBar) {
        UI.journalProgressBar.style.width = percent + "%";
    }
    if (UI.journalProgressText) {
        UI.journalProgressText.textContent = `${species} / ${total} (${percent}%)`;
    }
}

function getOrbChargePercent()
{
    if(!gameState.energyRequired)
    {
        return 0;
    }

    return Math.min(
        100,
        Math.round(
            (gameState.energy / gameState.energyRequired) * 100
        )
    );
}

function getCatchChance()
{
    if(!gameState.energyRequired)
    {
        return 0;
    }

    return Math.min(
        1,
        gameState.energy / gameState.energyRequired
    );
}

function updateOrbChargeDisplay()
{
    const percent = getOrbChargePercent();

    if(UI.orbChargePercent)
    {
        UI.orbChargePercent.textContent = percent + "%";
    }

    if(UI.catchChancePercent)
    {
        UI.catchChancePercent.textContent = percent + "%";
    }

    if(UI.orbChargeBar)
    {
        UI.orbChargeBar.style.width = percent + "%";
    }
}

function setMathEnabled(enabled)
{
    gameState.mathEnabled = enabled;

    if(UI.answer)
    {
        UI.answer.disabled = !enabled;
    }

    if(UI.submit)
    {
        UI.submit.disabled = !enabled;
    }
}

/* =====================================================
   ENCOUNTER ANIMATIONS
===================================================== */

function hideBanners()
{
    [UI.rareBanner, UI.legendaryBanner, UI.captureBanner, UI.shinyBanner]
    .forEach(el =>
    {
        if(el)
        {
            el.classList.remove("show", "captured", "escaped", "critical");
        }
    });
}

function triggerFlash(className)
{
    if(!UI.flashOverlay)
    {
        return;
    }

    UI.flashOverlay.classList.remove(
        "flash-blue", "flash-gold", "flash-green", "flash-red"
    );

    void UI.flashOverlay.offsetWidth;
    UI.flashOverlay.classList.add(className);
}

async function playRareEncounter()
{
    hideBanners();
    triggerFlash("flash-blue");

    if(UI.rareBanner)
    {
        UI.rareBanner.classList.add("show");
    }

    await wait(800);

    if(UI.rareBanner)
    {
        UI.rareBanner.classList.remove("show");
    }
}

async function playLegendaryEncounter()
{
    hideBanners();
    triggerFlash("flash-gold");

    if(UI.legendaryBanner)
    {
        UI.legendaryBanner.classList.add("show");
    }

    UI.monsterSprite.classList.add("monster-shake");

    await wait(1000);

    if(UI.legendaryBanner)
    {
        UI.legendaryBanner.classList.remove("show");
    }

    UI.monsterSprite.classList.remove("monster-shake");
}

async function playShinyBanner()
{
    if(!gameState.shiny || !UI.shinyBanner)
    {
        return;
    }

    UI.shinyBanner.classList.add("show");
    await wait(800);
    UI.shinyBanner.classList.remove("show");
}

/* =====================================================
   ENCOUNTER
===================================================== */

async function startEncounter()
{
    clearInterval(temperInterval);
    setMathEnabled(false);
    hideBanners();

    const monster = getMonster();

    gameState.currentMonster = monster;
    gameState.shiny = rollShiny();
    gameState.energy = 0;
    gameState.temper = 0;
    gameState.encounterActive = true;

    gameState.stats.encounters++;

    if(monster.rarity === "Rare")
    {
        gameState.stats.rareSeen++;
    }

    if(monster.rarity === "Legendary")
    {
        gameState.stats.legendarySeen++;
    }

    const rarityData = gameState.data.rarities[monster.rarity];
    gameState.energyRequired = rarityData.mathRequired;

    UI.monsterName.textContent = monster.name + (gameState.shiny ? " ✨" : "");
    UI.monsterRarity.textContent = monster.rarity;
    UI.monsterBiome.textContent = monster.biome;

    setBiome(monster.biome);

    UI.timerLabel.textContent = monster.rarity + " — " + rarityData.escapeTime + "s";
    UI.timerBar.style.width = "100%";
    UI.timerText.textContent = rarityData.escapeTime + "s";

    updateOrbChargeDisplay();

    const sprite = getMonsterSprite(monster, gameState.shiny);
    UI.monsterSprite.src = sprite;
    applyShinyVisuals(gameState.shiny);

    updateHUD();

    if(gameState.shiny)
    {
        await playShinyBanner();
    }

    if(monster.rarity === "Rare")
    {
        await playRareEncounter();
    }
    else if(monster.rarity === "Legendary")
    {
        await playLegendaryEncounter();
    }

    setMathEnabled(true);
    startTemperSystem();
    generateQuestion();
    checkAchievements();
    saveGame();
}

/* =====================================================
   TEMPER / TIMER
===================================================== */

function startTemperSystem()
{
    clearInterval(temperInterval);

    const rarityData = gameState.data.rarities[gameState.currentMonster.rarity];
    const totalTime = rarityData.escapeTime;
    const increment = 100 / (totalTime * 10);

    gameState.temper = 0;

    if (UI.timerBar) {
        UI.timerBar.classList.remove("timer-pulse");
    }

    temperInterval = setInterval(() =>
    {
        if(!gameState.encounterActive)
        {
            return;
        }

        gameState.temper += increment;

        const remaining = Math.max(0, 100 - gameState.temper);

        if (UI.timerBar) {
            UI.timerBar.style.width = remaining + "%";
            
            // Dynamic color shift based on time remaining
            if (remaining > 50) {
                UI.timerBar.style.background = "linear-gradient(90deg, #22c55e, #4ade80)";
            } else if (remaining > 20) {
                UI.timerBar.style.background = "linear-gradient(90deg, #eab308, #facc15)";
            } else {
                UI.timerBar.style.background = "linear-gradient(90deg, #ef4444, #f87171)";
            }
        }

        const secondsLeft = Math.ceil((totalTime * remaining) / 100);
        
        if (UI.timerText) {
            UI.timerText.textContent = secondsLeft + "s";
        }

        // Add warning pulse class when time is running out (<= 3 seconds)
        if (UI.timerBar) {
            if (secondsLeft <= 3) {
                UI.timerBar.classList.add("timer-pulse");
            } else {
                UI.timerBar.classList.remove("timer-pulse");
            }
        }

        if(gameState.temper >= 100)
        {
            clearInterval(temperInterval);
            monsterEscape();
        }

    }, 100);
}

/* =====================================================
   MATH
===================================================== */

function generateQuestion()
{
    const rarity = gameState.currentMonster.rarity;
    let question;

    if(rarity === "Common")
    {
        const a = random(1, 10);
        const b = random(1, 10);
        question = { text: `${a} + ${b}`, answer: a + b };
    }
    else if(rarity === "Rare")
    {
        const a = random(5, 20);
        const b = random(1, 10);

        if(Math.random() < 0.5)
        {
            question = { text: `${a} + ${b}`, answer: a + b };
        }
        else
        {
            question = { text: `${a} - ${b}`, answer: a - b };
        }
    }
    else
    {
        const a = random(2, 12);
        const b = random(2, 12);
        question = { text: `${a} × ${b}`, answer: a * b };
    }

    currentQuestion = question;
    UI.question.textContent = question.text;
    UI.answer.value = "";

    if(gameState.mathEnabled)
    {
        UI.answer.focus();
    }
}

function submitAnswer()
{
    if(!gameState.encounterActive || !gameState.mathEnabled)
    {
        return;
    }

    const value = Number(UI.answer.value);

    if(Number.isNaN(value))
    {
        return;
    }

    if(value !== currentQuestion.answer)
    {
        wrongAnswer();
        return;
    }

    correctAnswer();
}

function wrongAnswer()
{
    gameState.temper += 10;
    generateQuestion();
}

async function correctAnswer()
{
    playCorrectSound();
    gameState.energy++;
    updateOrbChargeDisplay();
    orbChargeAnimation();

    setMathEnabled(false);

    // Show Orb Charge banner before throwing the orb
    const percent = getOrbChargePercent();
    await showCaptureFeedback("charge", `Orb Charge: ${percent}%`);

    await throwOrb();

    if(!gameState.encounterActive)
    {
        return;
    }

    resolveOrbThrow();
}

function orbChargeAnimation()
{
    const orb = document.getElementById("captureOrb");

    if(!orb)
    {
        return;
    }

    orb.style.transform = "translateX(-50%) scale(1.2)";

    setTimeout(() =>
    {
        orb.style.transform = "translateX(-50%) scale(1)";
    }, 150);
}

/* =====================================================
   CAPTURE — each correct answer throws; chance = charge %
===================================================== */

function throwOrb()
{
    return new Promise(resolve =>
    {
        const orb = document.getElementById("captureOrb");

        if(!orb)
        {
            resolve();
            return;
        }

        orb.classList.remove("throw-orb");
        void orb.offsetWidth;
        orb.classList.add("throw-orb");

        setTimeout(resolve, 700);
    });
}

function resolveOrbThrow()
{
    const chance = getCatchChance();

    if(chance >= 1)
    {
        const critical = Math.random() < 0.05;

        if(critical)
        {
            gameState.stats.criticals++;
        }

        successfulCatch(critical);
        return;
    }

    const critical = Math.random() < 0.05;

    if(critical)
    {
        gameState.stats.criticals++;
        successfulCatch(true);
        return;
    }

    if(Math.random() < chance)
    {
        successfulCatch(false);
    }
    else
    {
        failedOrbThrow();
    }
}

function endEncounter()
{
    gameState.encounterActive = false;
    clearInterval(temperInterval);
}

async function failedOrbThrow()
{
    if(UI.captureBanner)
    {
        UI.captureBanner.textContent =
        "ORB MISSED! (" + getOrbChargePercent() + "% chance)";
        UI.captureBanner.classList.add("show", "missed");
    }

    triggerFlash("flash-red");

    await wait(700);

    if(UI.captureBanner)
    {
        UI.captureBanner.classList.remove("show", "missed");
    }

    if(gameState.encounterActive)
    {
        setMathEnabled(true);
        generateQuestion();
    }
}

async function showCaptureFeedback(type, text)
{
    hideBanners();

    if(UI.captureBanner)
    {
        UI.captureBanner.textContent = text;
        UI.captureBanner.classList.add("show", type);
    }

    const flashMap = {
        captured: "flash-green",
        escaped: "flash-red",
        critical: "flash-gold"
    };

    if (flashMap[type]) {
        triggerFlash(flashMap[type]);
    }

    const duration = type === "charge" ? 800 : 1200;
    await wait(duration);

    if(UI.captureBanner)
    {
        UI.captureBanner.classList.remove("show", type);
    }
}

function successfulCatch(critical = false)
{
    if(!gameState.currentMonster)
    {
        return;
    }

    if(!gameState.encounterActive)
    {
        return;
    }

    endEncounter();

    setMathEnabled(false);
    gameState.stats.catches++;
    gameState.streak++;
    gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak);

    const id = gameState.currentMonster.id;

    if(!gameState.collection.includes(id))
    {
        gameState.collection.push(id);
    }

    if(gameState.shiny)
    {
        gameState.stats.shinies++;
        if (!gameState.shinyCollection) {
            gameState.shinyCollection = [];
        }
        if (!gameState.shinyCollection.includes(id)) {
            gameState.shinyCollection.push(id);
        }
    }

    gainXP(gameState.currentMonster);
    updateHUD();
    checkAchievements();
    saveGame();

    playCaptureSound();

    if(critical)
    {
        showCaptureFeedback("critical", "CRITICAL CATCH!");
    }
    else
    {
        showCaptureFeedback("captured", "CAPTURED!");
    }

    setTimeout(() => startEncounter(), 1500);
}

function monsterEscape()
{
    if(!gameState.encounterActive)
    {
        return;
    }

    endEncounter();
    gameState.stats.escapes++;
    gameState.streak = 0;

    updateHUD();
    saveGame();

    playEscapeSound();
    showCaptureFeedback("escaped", "ESCAPED!");

    setTimeout(() => startEncounter(), 1500);
}

/* =====================================================
   XP / RANK
===================================================== */

function gainXP(monster)
{
    let xp = 10;

    if(monster.rarity === "Rare")
    {
        xp = 25;
    }

    if(monster.rarity === "Legendary")
    {
        xp = 75;
    }

    if(gameState.shiny)
    {
        xp *= 2;
    }

    gameState.xp += xp;
    updateRank();
}

function updateRank()
{
    const xp = gameState.xp;

    if(xp < 100)
    {
        gameState.rank = "Novice";
    }
    else if(xp < 300)
    {
        gameState.rank = "Explorer";
    }
    else if(xp < 700)
    {
        gameState.rank = "Hunter";
    }
    else if(xp < 1500)
    {
        gameState.rank = "Master";
    }
    else
    {
        gameState.rank = "Legend";
    }

    const rankEl = document.getElementById("rankText");
    const xpEl = document.getElementById("xpText");

    if(rankEl)
    {
        rankEl.textContent = gameState.rank;
    }

    if(xpEl)
    {
        xpEl.textContent = gameState.xp;
    }
}

/* =====================================================
   ACHIEVEMENTS
===================================================== */

const ACHIEVEMENTS = [

    {
        id: "firstCatch",
        name: "First Catch",
        condition: () => gameState.stats.catches >= 1
    },
    {
        id: "tenCatch",
        name: "10 Captures",
        condition: () => gameState.stats.catches >= 10
    },
    {
        id: "twentyFiveCatch",
        name: "25 Captures",
        condition: () => gameState.stats.catches >= 25
    },
    {
        id: "fiftyCatch",
        name: "50 Captures",
        condition: () => gameState.stats.catches >= 50
    },
    {
        id: "firstRare",
        name: "First Rare",
        condition: () => gameState.stats.rareSeen >= 1
    },
    {
        id: "firstLegendary",
        name: "First Legendary",
        condition: () => gameState.stats.legendarySeen >= 1
    },
    {
        id: "firstShiny",
        name: "First Shiny",
        condition: () => gameState.stats.shinies >= 1
    },
    {
        id: "collection25",
        name: "25% Collection",
        condition: () => gameState.collection.length >= Math.ceil(getTotalSpecies() * 0.25)
    },
    {
        id: "collection50",
        name: "50% Collection",
        condition: () => gameState.collection.length >= Math.ceil(getTotalSpecies() * 0.50)
    },
    {
        id: "collection75",
        name: "75% Collection",
        condition: () => gameState.collection.length >= Math.ceil(getTotalSpecies() * 0.75)
    },
    {
        id: "collection100",
        name: "100% Collection",
        condition: () => gameState.collection.length >= getTotalSpecies()
    }
];

function checkAchievements()
{
    ACHIEVEMENTS.forEach(achievement =>
    {
        if(gameState.achievements.includes(achievement.id))
        {
            return;
        }

        if(achievement.condition())
        {
            unlockAchievement(achievement);
        }
    });
}

function unlockAchievement(achievement)
{
    gameState.achievements.push(achievement.id);
    saveGame();
    showAchievementToast(achievement.name);
}

function showAchievementToast(name)
{
    const container = document.getElementById("achievementContainer");
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.style.display = "flex";
    toast.style.alignItems = "center";

    toast.innerHTML = `
        <div style="font-size: 20px; margin-right: 12px; line-height: 1;">🏆</div>
        <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
            <div style="font-size: 9px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; line-height: 1.2;">Achievement!</div>
            <div style="font-size: 13px; font-weight: 800; line-height: 1.2;">${name}</div>
        </div>
    `;

    (container || document.body).appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* =====================================================
   JOURNAL
===================================================== */

function buildJournal()
{
    const grid = document.getElementById("collectionGrid");

    if(!grid)
    {
        return;
    }

    grid.innerHTML = "";

    gameState.data.monsters.forEach(monster =>
    {
        const owned = gameState.collection.includes(monster.id);
        const shinyOwned = gameState.shinyCollection && gameState.shinyCollection.includes(monster.id);

        const card = document.createElement("div");
        card.className = "monster-card" + (owned ? " owned" : "");

        if (owned)
        {
            let isShinyView = shinyOwned;
            
            const renderCardContent = () => {
                const sprite = (isShinyView && monster.shinySprite) ? monster.shinySprite : monster.sprite;
                
                const filterStyle = (isShinyView && monster.id !== "starveil") 
                    ? getShinyFilter(monster.id) + " drop-shadow(0 0 10px gold)" 
                    : (isShinyView ? "drop-shadow(0 0 10px gold)" : "none");
                
                card.innerHTML = `
                    <div class="card-inner">
                        ${shinyOwned ? `<button class="shiny-toggle-btn ${isShinyView ? 'active' : ''}" title="Toggle Shiny View">✨</button>` : ''}
                        <img src="${sprite}" alt="${monster.name}" style="filter: ${filterStyle};">
                        <h3>${monster.name}${isShinyView ? ' ✨' : ''}</h3>
                        <p>${monster.rarity}</p>
                    </div>
                `;

                const btn = card.querySelector(".shiny-toggle-btn");
                if (btn) {
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        isShinyView = !isShinyView;
                        renderCardContent();
                    });
                }
            };
            
            renderCardContent();
        }
        else
        {
            card.innerHTML = `<h3>???</h3><p>Undiscovered</p>`;
        }

        grid.appendChild(card);
    });

    // Update journal modal progress bar
    const total = getTotalSpecies();
    const species = gameState.collection.length;
    const percent = Math.round((species / total) * 100);

    const progressText = document.getElementById("journalProgressText");
    const progressBar = document.getElementById("journalProgressBarInner");

    if (progressText) {
        progressText.textContent = `${species} / ${total} (${percent}%)`;
    }
    if (progressBar) {
        progressBar.style.width = percent + "%";
    }
}

/* =====================================================
   STATS MODAL
===================================================== */

function updateStatsModal()
{
    const fields = {
        totalEncounters: gameState.stats.encounters,
        totalCaptures: gameState.stats.catches,
        totalEscapes: gameState.stats.escapes,
        rareSeen: gameState.stats.rareSeen,
        legendarySeen: gameState.stats.legendarySeen,
        totalShinies: gameState.stats.shinies,
        bestComboStat: gameState.bestStreak
    };

    for(const [id, value] of Object.entries(fields))
    {
        const el = document.getElementById(id);

        if(el)
        {
            el.textContent = value;
        }
    }
}

/* =====================================================
   MODALS
===================================================== */

function openModal(id)
{
    const modal = document.getElementById(id);

    if(modal)
    {
        modal.classList.remove("hidden");
    }
}

function closeAllModals()
{
    document.querySelectorAll(".modal").forEach(modal =>
    {
        modal.classList.add("hidden");
    });
}

/* =====================================================
   AUDIO — correct click, capture success, escape pop
===================================================== */

function getAudio()
{
    if(!audioContext)
    {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    return audioContext;
}

function playTone(freq, duration, type = "sine", volume = 0.08)
{
    if(!gameState.settings.sound)
    {
        return;
    }

    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
}

function playCorrectSound()
{
    if(!gameState.settings.sound) return;
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
}

function playCaptureSound()
{
    if(!gameState.settings.sound) return;
    const ctx = getAudio();
    
    const playNote = (freq, startOffset, duration, vol = 0.06) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startOffset);
        osc.stop(ctx.currentTime + startOffset + duration);
    };
    
    playNote(523.25, 0.0, 0.15); // C5
    playNote(659.25, 0.08, 0.15); // E5
    playNote(784.00, 0.16, 0.15); // G5
    playNote(1046.50, 0.24, 0.3); // C6
}

function playEscapeSound()
{
    if(!gameState.settings.sound) return;
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
}

/* =====================================================
   INPUT / BUTTONS
===================================================== */

function bindMathInput()
{
    if(!UI.answer)
    {
        return;
    }

    UI.answer.addEventListener("keydown", event =>
    {
        if(event.key === "Enter")
        {
            submitAnswer();
        }
    });
}

function bindButtons()
{
    if(UI.submit)
    {
        UI.submit.addEventListener("click", submitAnswer);
    }

    const journal = document.getElementById("journalButton");

    if(journal)
    {
        journal.addEventListener("click", () =>
        {
            buildJournal();
            openModal("collectionModal");
        });
    }

    const stats = document.getElementById("statsButton");

    if(stats)
    {
        stats.addEventListener("click", () =>
        {
            updateStatsModal();
            openModal("statsModal");
        });
    }

    const settings = document.getElementById("settingsButton");

    if(settings)
    {
        settings.addEventListener("click", () => openModal("settingsModal"));
    }

    const soundToggle = document.getElementById("soundToggle");

    if(soundToggle)
    {
        soundToggle.checked = gameState.settings.sound;
        soundToggle.addEventListener("change", () =>
        {
            gameState.settings.sound = soundToggle.checked;
            saveGame();
        });
    }

    const resetBtn = document.getElementById("resetProgress");

    if(resetBtn)
    {
        resetBtn.addEventListener("click", () =>
        {
            if(confirm("Reset all progress?"))
            {
                localStorage.removeItem(SAVE_KEY);
                location.reload();
            }
        });
    }

    document.querySelectorAll(".closeModal").forEach(button =>
    {
        button.addEventListener("click", closeAllModals);
    });
}

function setupImageFallback()
{
    if(!UI.monsterSprite)
    {
        return;
    }

    UI.monsterSprite.onerror = () =>
    {
        const monster = gameState.currentMonster;

        if(!monster)
        {
            return;
        }

        if(gameState.shiny && UI.monsterSprite.src.includes("shiny"))
        {
            UI.monsterSprite.src = monster.sprite;
            applyShinyVisuals(true);
            return;
        }

        UI.monsterSprite.alt = monster.name;
    };
}

/* =====================================================
   INIT
===================================================== */

window.addEventListener("error", event =>
{
    console.error("Game Error:", event.error);
});

async function init()
{
    try
    {
        cacheDOM();
        loadGame();
        await loadMonsterData();
        setupImageFallback();
        bindMathInput();
        bindButtons();
        updateHUD();
        updateRank();
        checkAchievements();
        startEncounter();
    }
    catch(error)
    {
        console.error(error);

        if(UI.monsterName)
        {
            UI.monsterName.textContent = "Failed to load game.";
        }
    }
}

window.addEventListener("DOMContentLoaded", init);
