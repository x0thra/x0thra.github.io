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

  let hasStarted = $state(false);
  let isBooting = $state(false);
  let awaitingMobileConfirm = $state(false);
  let renderedBootLines = $state([]);
  let isTerminated = $state(false);
  let isAsciiPanel = $state(false);
  let displayedText = $state('');
  let isTyping = $state(false);
  let isErasing = $state(false);
  let currentOptions = $state([]);
  let selectedOptionIndex = $state(0);
  let justLookingUsed = $state(false);
  let lookLeftUsed = $state(false);
  let lookRightUsed = $state(false);
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

  function isMobileDevice() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return (
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768
    );
  }

  async function verifyVisitorOnce() {
    try {
      localStorage.removeItem('x0thra_sec_state');
    } catch {}

    if (isBotUserAgent()) {
      isTrustedVisitor = false;
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
      { id: 'dont_know', label: DIALOGUE_STRINGS.options.dontKnow },
      { id: 'system_info', label: DIALOGUE_STRINGS.options.systemInfo }
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

    setOptions([
      { id: 'system_info', label: DIALOGUE_STRINGS.options.systemInfo },
      { id: 'go_back', label: DIALOGUE_STRINGS.options.goBack }
    ]);
  }

  async function handleSystemInfo() {
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.systemInfoContent, {
      speed: 14,
      asciiPanel: true,
      runId
    });
    if (!completed) return;

    setOptions([
      { id: 'view_source', label: DIALOGUE_STRINGS.options.viewSource },
      { id: 'go_back', label: DIALOGUE_STRINGS.options.goBack }
    ]);
  }

  function showLookAroundOptions() {
    setOptions([
      {
        id: 'look_left',
        label: DIALOGUE_STRINGS.options.lookLeft,
        disabled: lookLeftUsed
      },
      {
        id: 'look_right',
        label: DIALOGUE_STRINGS.options.lookRight,
        disabled: lookRightUsed
      },
      {
        id: 'look_behind',
        label: DIALOGUE_STRINGS.options.lookBehind
      }
    ]);
  }

  async function handleJustLookingAround() {
    justLookingUsed = true;
    const runId = ++activeRunId;
    const completed = await typeText(DIALOGUE_STRINGS.lookingAroundIntro, {
      speed: 34,
      runId
    });
    if (!completed) return;

    showLookAroundOptions();
  }

  async function handleLookDirection(direction) {
    const runId = ++activeRunId;

    if (direction === 'left') {
      lookLeftUsed = true;
      const completed = await typeText(DIALOGUE_STRINGS.lookLeftResponse, {
        speed: 34,
        runId
      });
      if (!completed) return;
      showLookAroundOptions();
      return;
    }

    if (direction === 'right') {
      lookRightUsed = true;
      const completed = await typeText(DIALOGUE_STRINGS.lookRightResponse, {
        speed: 34,
        runId
      });
      if (!completed) return;
      showLookAroundOptions();
      return;
    }

    playDistrustSound();
    const suspenseDone = await typeText(DIALOGUE_STRINGS.lookBehindSuspense, {
      speed: 220,
      runId
    });
    if (!suspenseDone) return;

    await sleep(2000);
    if (runId !== activeRunId) return;

    const followupDone = await typeText(DIALOGUE_STRINGS.lookBehindFollowup, {
      speed: 34,
      runId
    });
    if (!followupDone) return;

    await sleep(1800);
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
      case 'look_left':
        handleLookDirection('left');
        break;
      case 'look_right':
        handleLookDirection('right');
        break;
      case 'look_behind':
        handleLookDirection('behind');
        break;
      case 'what_is_this':
        handleWhatIsThisPlace();
        break;
      case 'system_info':
        handleSystemInfo();
        break;
      case 'view_source':
        window.open(DIALOGUE_STRINGS.sourceRepoUrl, '_blank', 'noopener,noreferrer');
        setOptions([
          { id: 'view_source', label: DIALOGUE_STRINGS.options.viewSource },
          { id: 'go_back', label: DIALOGUE_STRINGS.options.goBack }
        ]);
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

  async function typeBootLine(text, runId) {
    const lineIdx = renderedBootLines.length;
    renderedBootLines = [...renderedBootLines, ''];

    for (const char of text) {
      if (runId !== activeRunId) return false;
      renderedBootLines[lineIdx] += char;
      playTypeSound(char);
      await sleep(22 + Math.random() * 12);
    }
    return true;
  }

  async function finishBootToRoot(runId) {
    const ok = await typeBootLine(DIALOGUE_STRINGS.bootConnected, runId);
    if (!ok) return;

    await sleep(400);
    if (runId !== activeRunId) return;

    renderedBootLines = [];
    await sleep(200);
    if (runId !== activeRunId) return;

    isBooting = false;
    showRootQuestion();
  }

  async function handleMobileChoice(choice) {
    if (!awaitingMobileConfirm || isTerminated) return;
    awaitingMobileConfirm = false;
    playSelectSound();

    const runId = ++activeRunId;
    const lastIdx = renderedBootLines.length - 1;
    renderedBootLines[lastIdx] += ` ${choice}`;

    if (choice === 'Y') {
      choiceHistory.push('Mobile Warning: Y');
      await sleep(250);
      if (runId !== activeRunId) return;
      renderedBootLines = [...renderedBootLines, ''];
      await finishBootToRoot(runId);
      return;
    }

    choiceHistory.push('Mobile Warning: N');
    await sleep(200);
    if (runId !== activeRunId) return;

    renderedBootLines = [...renderedBootLines, ''];
    const abortedOk = await typeBootLine(DIALOGUE_STRINGS.bootAborted, runId);
    if (!abortedOk) return;

    flushTelemetry();
    await sleep(600);

    isTerminated = true;
    try {
      window.close();
    } catch {}

    setTimeout(() => {
      try {
        window.location.replace('about:blank');
      } catch {}
    }, 180);
  }

  async function startSession() {
    if (hasStarted || isBooting || isTerminated) return;
    hasStarted = true;
    isBooting = true;
    awaitingMobileConfirm = false;
    renderedBootLines = [];

    unlockAudio();
    playSelectSound();

    const runId = ++activeRunId;
    await sleep(120);

    for (let i = 0; i < DIALOGUE_STRINGS.bootSteps.length; i++) {
      const step = DIALOGUE_STRINGS.bootSteps[i];
      const ok = await typeBootLine(step.text, runId);
      if (!ok) return;
      await sleep(step.delay);
    }

    if (isMobileDevice()) {
      renderedBootLines = [...renderedBootLines, ''];
      for (const line of DIALOGUE_STRINGS.mobileWarningLines) {
        const ok = await typeBootLine(line, runId);
        if (!ok) return;
        await sleep(180);
      }
      if (runId !== activeRunId) return;
      awaitingMobileConfirm = true;
      return;
    }

    await finishBootToRoot(runId);
  }

  function handleWindowKeyDown(e) {
    if (isTerminated) return;

    if (awaitingMobileConfirm) {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleMobileChoice('Y');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleMobileChoice('N');
      }
      return;
    }

    if (isBooting) return;

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
      class="min-h-screen w-full bg-black flex items-start justify-start p-4 sm:p-6 cursor-pointer border-none focus:outline-none text-left"
      aria-label="Boot system"
    >
      <span class="neon-text-dim hover:text-white transition-colors text-xs sm:text-sm">
        {DIALOGUE_STRINGS.connectPrompt}<span class="terminal-cursor ml-1"></span>
      </span>
    </button>
  </main>
{:else if isBooting}
  <main class="min-h-screen w-full bg-black flex flex-col items-start justify-start p-4 sm:p-6">
    <div class="flex flex-col space-y-1 text-xs sm:text-sm neon-text">
      {#each renderedBootLines as line, idx}
        <div class="min-h-[1.25rem]">
          <span>{line}</span>{#if idx === renderedBootLines.length - 1}<span class="terminal-cursor ml-0.5"></span>{/if}
        </div>
      {/each}

      {#if awaitingMobileConfirm}
        <div class="flex items-center gap-6 pt-3">
          <button
            type="button"
            onclick={() => handleMobileChoice('Y')}
            class="neon-text hover:underline py-1 px-2 border border-white/30 bg-white/[0.04] focus:outline-none"
          >
            [ Y ]
          </button>
          <button
            type="button"
            onclick={() => handleMobileChoice('N')}
            class="neon-text-dim hover:text-white hover:underline py-1 px-2 border border-white/20 focus:outline-none"
          >
            [ N ]
          </button>
        </div>
      {/if}
    </div>
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
