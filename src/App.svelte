<script>
  import { onMount } from 'svelte';
  import { DIALOGUE_STRINGS } from './lib/dialogue.js';
  import {
    unlockAudio,
    playTypeSound,
    playEraseSound,
    playSelectSound,
    playDistrustSound
  } from './lib/sound.js';

  const WORKER_URL = 'https://green-bread-f7b4.x0thra.workers.dev/';
  const CACHE_KEY = 'x0thra_sec_state';
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

  let hasStarted = $state(false);
  let isTerminated = $state(false);
  let isAsciiPanel = $state(false);
  let displayedText = $state('');
  let isTyping = $state(false);
  let isErasing = $state(false);
  let currentOptions = $state([]);
  let selectedOptionIndex = $state(0);
  let justLookingUsed = $state(false);
  let untrustedLocked = $state(false);

  let isTrustedVisitor = true;
  let hasVerifiedSession = false;
  let visitorCheckPromise = null;
  let choiceHistory = [];
  let lastFlushedCount = 0;
  let activeRunId = 0;

  function isBotUserAgent() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|discordbot|twitterbot/i.test(ua);
  }

  function readCachedTrustState() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.trusted === 'boolean' &&
        typeof parsed.ts === 'number' &&
        Date.now() - parsed.ts < CACHE_TTL_MS
      ) {
        return parsed.trusted;
      }
    } catch {}
    return null;
  }

  function writeCachedTrustState(trusted) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ trusted, ts: Date.now() })
      );
    } catch {}
  }

  async function verifyVisitorOnce() {
    if (isBotUserAgent()) {
      isTrustedVisitor = false;
      writeCachedTrustState(false);
      return;
    }

    const cached = readCachedTrustState();
    if (cached !== null) {
      isTrustedVisitor = cached;
      return;
    }

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          userAgent: navigator.userAgent
        })
      });
      const data = await response.json();
      isTrustedVisitor = !(data && data.isProxy);
      writeCachedTrustState(isTrustedVisitor);
    } catch {
      // Keep default trust state if the worker is unreachable
    }
  }

  function getOrStartVisitorCheck() {
    if (!visitorCheckPromise) {
      visitorCheckPromise = verifyVisitorOnce();
    }
    return visitorCheckPromise;
  }

  function flushTelemetry() {
    if (choiceHistory.length === 0 || choiceHistory.length === lastFlushedCount) {
      return;
    }
    lastFlushedCount = choiceHistory.length;

    const historyStr = choiceHistory.join(' -> ').substring(0, 1000);
    fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'history',
        historyStr,
        commandCount: choiceHistory.length
      }),
      keepalive: true
    }).catch(() => {});
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function typeText(text, { speed = 34, asciiPanel = false, runId = activeRunId } = {}) {
    isTyping = true;
    isAsciiPanel = asciiPanel;
    currentOptions = [];
    displayedText = '';

    let borderBurstCount = 0;

    for (let i = 0; i < text.length; i++) {
      if (runId !== activeRunId) return false;

      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';
      const nextChar = i < text.length - 1 ? text[i + 1] : '';
      displayedText += char;

      const isBorderOrPad =
        asciiPanel &&
        ((char === ' ' && prevChar === ' ') ||
          char === '|' ||
          char === '+' ||
          (char === '-' && (prevChar === '-' || nextChar === '-' || prevChar === '+' || nextChar === '+')));

      if (isBorderOrPad) {
        borderBurstCount++;
        if (borderBurstCount % 8 === 0) {
          await sleep(4);
        }
        continue;
      }

      borderBurstCount = 0;
      playTypeSound(char);

      let delay = speed + (Math.random() * 14 - 7);
      if (!asciiPanel) {
        if (char === '.' || char === '?' || char === '!') {
          delay += 170;
        } else if (char === ',' || char === ':') {
          delay += 75;
        } else if (char === '\n') {
          delay += 110;
        }
      } else if (char === '\n') {
        delay = 18;
      }

      await sleep(Math.max(8, delay));
    }

    if (runId !== activeRunId) return false;
    isTyping = false;
    return true;
  }

  async function eraseAllText(runId = activeRunId) {
    isErasing = true;
    currentOptions = [];

    while (displayedText.length > 0) {
      if (runId !== activeRunId) return false;
      const step = displayedText.length > 80 ? 2 : 1;
      displayedText = displayedText.slice(0, -step);
      playEraseSound();
      await sleep(16);
    }

    isErasing = false;
    return true;
  }

  function setOptions(options) {
    currentOptions = options;
    const firstEnabled = options.findIndex((opt) => !opt.disabled);
    selectedOptionIndex = firstEnabled >= 0 ? firstEnabled : 0;
  }

  async function showRootQuestion() {
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.rootQuestion, { speed: 36, runId });
    if (!completed) return;

    setOptions([
      {
        id: 'whos_x0thra',
        label: DIALOGUE_STRINGS.options.whosX0thra,
        disabled: untrustedLocked
      },
      {
        id: 'just_looking',
        label: DIALOGUE_STRINGS.options.justLooking,
        disabled: justLookingUsed
      },
      { id: 'what_is_this', label: DIALOGUE_STRINGS.options.whatIsThis },
      { id: 'dont_know', label: DIALOGUE_STRINGS.options.dontKnow }
    ]);
  }

  async function handleWhosX0thra() {
    const runId = ++activeRunId;

    if (!hasVerifiedSession) {
      const checkCompleted = await typeText(DIALOGUE_STRINGS.securityCheck, { speed: 28, runId });
      if (!checkCompleted) return;

      await Promise.all([getOrStartVisitorCheck(), sleep(950)]);
      if (runId !== activeRunId) return;
      hasVerifiedSession = true;
    }

    if (!isTrustedVisitor) {
      untrustedLocked = true;
      playDistrustSound();
      const untrustedCompleted = await typeText(DIALOGUE_STRINGS.untrustedPrompt, {
        speed: 42,
        runId
      });
      if (!untrustedCompleted) return;

      setOptions([
        { id: 'untrusted_why', label: DIALOGUE_STRINGS.options.why },
        { id: 'go_back', label: DIALOGUE_STRINGS.options.goBack }
      ]);
      return;
    }

    const aboutCompleted = await typeText(DIALOGUE_STRINGS.aboutContent, {
      speed: 14,
      asciiPanel: true,
      runId
    });
    if (!aboutCompleted) return;

    setOptions([
      { id: 'is_this_all', label: DIALOGUE_STRINGS.options.isThisAll },
      { id: 'go_back', label: DIALOGUE_STRINGS.options.goBack }
    ]);
  }

  async function handleUntrustedWhy() {
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.untrustedWhyResponse, {
      speed: 36,
      runId
    });
    if (!completed) return;

    await sleep(3000);
    if (runId !== activeRunId) return;
    await showRootQuestion();
  }

  async function handleIsThisAll() {
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.isThisAllResponse, {
      speed: 34,
      runId
    });
    if (!completed) return;

    setOptions([{ id: 'go_back', label: DIALOGUE_STRINGS.options.goBack }]);
  }

  async function handleWhatIsThisPlace() {
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.whatIsThisPlaceContent, {
      speed: 24,
      runId
    });
    if (!completed) return;

    setOptions([{ id: 'go_back', label: DIALOGUE_STRINGS.options.goBack }]);
  }

  async function handleJustLookingAround() {
    justLookingUsed = true;
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.lookingAroundResponse, {
      speed: 36,
      runId
    });
    if (!completed) return;

    await sleep(10000);
    if (runId !== activeRunId) return;
    await showRootQuestion();
  }

  async function handleDontKnow() {
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.dontKnowResponse, {
      speed: 38,
      runId
    });
    if (!completed) return;

    await sleep(900);
    if (runId !== activeRunId) return;

    await eraseAllText(runId);
    flushTelemetry();
    await sleep(250);

    isTerminated = true;

    // Browsers block window.close() on tabs not opened via script; fall back to about:blank.
    try {
      window.close();
    } catch {}

    setTimeout(() => {
      try {
        window.location.replace('about:blank');
      } catch {}
    }, 180);
  }

  function selectOption(option) {
    if (!option || option.disabled || isTyping || isErasing || isTerminated) return;

    playSelectSound();
    choiceHistory.push(option.label);
    currentOptions = [];

    switch (option.id) {
      case 'whos_x0thra':
        handleWhosX0thra();
        break;
      case 'just_looking':
        handleJustLookingAround();
        break;
      case 'what_is_this':
        handleWhatIsThisPlace();
        break;
      case 'dont_know':
        handleDontKnow();
        break;
      case 'is_this_all':
        handleIsThisAll();
        break;
      case 'untrusted_why':
        handleUntrustedWhy();
        break;
      case 'go_back':
        showRootQuestion();
        break;
    }
  }

  function startSession() {
    if (hasStarted || isTerminated) return;
    hasStarted = true;
    unlockAudio();
    playSelectSound();
    showRootQuestion();
  }

  function handleWindowKeyDown(e) {
    if (isTerminated) return;

    if (!hasStarted) {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }
      e.preventDefault();
      startSession();
      return;
    }

    if (isTyping || isErasing || currentOptions.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      let next = selectedOptionIndex;
      for (let i = 0; i < currentOptions.length; i++) {
        next = (next + 1) % currentOptions.length;
        if (!currentOptions[next].disabled) {
          selectedOptionIndex = next;
          break;
        }
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      let prev = selectedOptionIndex;
      for (let i = 0; i < currentOptions.length; i++) {
        prev = (prev - 1 + currentOptions.length) % currentOptions.length;
        if (!currentOptions[prev].disabled) {
          selectedOptionIndex = prev;
          break;
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const chosen = currentOptions[selectedOptionIndex];
      if (chosen && !chosen.disabled) {
        selectOption(chosen);
      }
    }
  }

  onMount(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushTelemetry();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushTelemetry);

    return () => {
      activeRunId++;
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushTelemetry);
    };
  });
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

<div class="crt-overlay fixed inset-0 pointer-events-none z-50"></div>

{#if isTerminated}
  <main class="min-h-screen w-full bg-black"></main>
{:else if !hasStarted}
  <main class="min-h-screen w-full bg-black">
    <button
      type="button"
      onclick={startSession}
      class="min-h-screen w-full bg-black flex items-center justify-center p-6 cursor-pointer border-none focus:outline-none"
      aria-label="Start"
    >
      <span class="neon-text-dim hover:text-white transition-colors text-sm">
        {DIALOGUE_STRINGS.connectPrompt}
      </span>
    </button>
  </main>
{:else}
  <main class="min-h-screen w-full bg-black flex flex-col justify-center items-center p-6 sm:p-12">
    <div class="w-full max-w-2xl flex flex-col space-y-8">
      <div
        class="min-h-[4rem] neon-text {isAsciiPanel
          ? 'ascii-panel text-xs sm:text-sm md:text-[15px] leading-snug whitespace-pre overflow-x-auto'
          : 'text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words'}"
      >
        <span>{displayedText}</span><span
          class={isTyping || isErasing ? 'terminal-cursor-typing ml-0.5' : 'terminal-cursor ml-0.5'}
        ></span>
      </div>

      {#if currentOptions.length > 0 && !isTyping && !isErasing}
        <div class="flex flex-col space-y-2.5 pt-2 border-t border-white/10">
          {#each currentOptions as option, idx}
            <button
              type="button"
              disabled={option.disabled}
              onclick={() => selectOption(option)}
              onmouseenter={() => {
                if (!option.disabled) selectedOptionIndex = idx;
              }}
              class="group text-left text-sm sm:text-base py-1.5 px-2 transition-all duration-150 flex items-center gap-3 focus:outline-none {option.disabled
                ? 'opacity-30 line-through cursor-not-allowed text-white/40'
                : selectedOptionIndex === idx
                  ? 'neon-text translate-x-1'
                  : 'neon-text-dim hover:text-white'}"
            >
              <span class="w-4 inline-block font-bold">
                {selectedOptionIndex === idx && !option.disabled ? '>' : ' '}
              </span>
              <span>{option.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </main>
{/if}
