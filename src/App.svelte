<script>
  import { onMount, afterUpdate } from 'svelte';
  
  let isLoggedIn = false;
  let isLoggingIn = false;
  let loginInput = '';
  let loginInputEl;
  let username = 'guest';
  let failedLogins = [];

  $: loginInput = loginInput.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);

  const DISCORD_WEBHOOK_URL = 'https://green-bread-f7b4.x0thra.workers.dev/';

  let commandHistory = [];
  let currentInput = '';
  let inputElement;
  let terminalContainer;
  let currentPath = ['~'];
  let isMatrixMode = false;
  let matrixCanvas;

  const fileSystem = {
    '~': {
      type: 'dir',
      contents: {
        'projects': {
          type: 'dir',
          contents: {
            'proxy-blocking-rules.txt': { type: 'file', text: 'Repo: proxy-blocking-rules\nDescription: Rules and configs for blocking proxies/VPNs.\nLink: <a href="https://github.com/x0thra/proxy-blocking-rules" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">github.com/x0thra/proxy-blocking-rules</a>', isHtml: true },
            'x0thra.github.io.txt': { type: 'file', text: 'Repo: x0thra.github.io\nDescription: Arch Linux TTY inspired portfolio.\nLink: <a href="https://github.com/x0thra/x0thra.github.io" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">github.com/x0thra/x0thra.github.io</a>', isHtml: true }
          }
        },
        'about.txt': { type: 'file', text: 'Name: x0thra\nAge: 19\nSign: Cancer\nPersonality: ISFP-T 9w1\n\nActivities:\nMost of my time is spent diving into games, writing code, and getting lost in music.\nIt\'s how I prefer to disconnect from the noise.' },
        'thoughts.txt': { type: 'file', text: `"Observation over interaction. Keeping things minimal and quiet."\n"Silence isn't empty, it's full of answers."\n"Creating in the dark, away from the spotlight."` },
        'socials.txt': { 
          type: 'file',
          text: 'GitHub:    <a href="https://github.com/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">github.com/x0thra</a>\nReddit:    <a href="https://reddit.com/user/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">reddit.com/user/x0thra</a>\nInstagram: <a href="https://instagram.com/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">instagram.com/x0thra</a>\nDiscord:   <a href="https://discordapp.com/users/1529340252261716088" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">@x0thra</a>\nSteam:     <a href="https://steamcommunity.com/profiles/76561199304734685/" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">steamcommunity.com/profiles/76561199304734685</a>\nLast.fm:   <a href="https://last.fm/user/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">last.fm/user/x0thra</a>',
          isHtml: true
        }
      }
    }
  };

  const getDir = (pathArray) => {
    let current = fileSystem['~'];
    for (let i = 1; i < pathArray.length; i++) {
      if (current && current.type === 'dir' && current.contents[pathArray[i]]) {
        current = current.contents[pathArray[i]];
      } else {
        return null;
      }
    }
    return current;
  };

  const startMatrix = () => {
    isMatrixMode = true;
    setTimeout(() => {
      if (!matrixCanvas) return;
      const ctx = matrixCanvas.getContext('2d');
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
      
      // Klasik ve göz aşinalığı olan Hiragana + Katakana + Latin harfleri (sayılar kaldırıldı)
      const japanese = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
      const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const characters = (japanese + latin).split('');
      
      const fontSize = 22; // İstediğiniz 22px boyutu
      const columns = Math.floor(matrixCanvas.width / fontSize);
      const drops = [];
      const speeds = [];
      for (let x = 0; x < columns; x++) {
        drops[x] = Math.random() * -100; // Start off-screen randomly
        speeds[x] = Math.random() * 0.5 + 0.2; // Sütunlara rastgele hız
      }
      
      let lastDrawTime = 0;
      
      const draw = (time) => {
        if (!isMatrixMode) return;
        requestAnimationFrame(draw);
        
        // Anti-aliasing bulanıklığını önlemek ve akıcılığı korumak için 30 FPS limiti
        if (time - lastDrawTime < 33) return; 
        lastDrawTime = time;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        
        ctx.fillStyle = '#a78bfa';
        ctx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < drops.length; i++) {
          if (drops[i] >= 0) {
            const text = characters[Math.floor(Math.random() * characters.length)];
            const y = Math.floor(drops[i]) * fontSize;
            ctx.fillText(text, i * fontSize, y);
          }
          
          if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
            drops[i] = 0;
            speeds[i] = Math.random() * 0.5 + 0.2;
          } else {
            drops[i] += speeds[i];
          }
        }
      };
      requestAnimationFrame(draw);
    }, 100);
  };
  
  const onGlobalKeyDown = (e) => {
    if (isMatrixMode && (e.key === 'Escape' || (e.ctrlKey && e.key === 'c'))) {
      isMatrixMode = false;
      commandHistory = [...commandHistory, { type: 'output', text: 'Matrix mode terminated.' }];
      setTimeout(() => focusInput(), 100);
    }
  };

  const handleLogin = async () => {
    const trimmedUser = loginInput.trim();
    if (!trimmedUser) return;
    
    const candidateUsername = trimmedUser.toLowerCase().replace(/\s+/g, '_');
    
    // Yasaklı kullanıcı isimleri
    const forbiddenNames = ['root', 'admin', 'administrator', 'x0thra', 'system', 'sysadmin'];
    
    if (forbiddenNames.includes(candidateUsername)) {
      isLoggingIn = true; // Şifre doğruluyormuş gibi yap
      setTimeout(() => {
        isLoggingIn = false;
        failedLogins = [...failedLogins, candidateUsername];
        loginInput = '';
        setTimeout(() => focusInput(), 50);
      }, 1200); // 1.2 saniye gecikme
      return;
    }

    username = candidateUsername;
    isLoggingIn = true;

    if (DISCORD_WEBHOOK_URL && DISCORD_WEBHOOK_URL !== 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
      try {
        fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username })
        }).catch(() => {});
      } catch(e) {}
    }

    setTimeout(() => {
      isLoggedIn = true;
      commandHistory = [
        { type: 'output', text: `Welcome to my page, ${username}.\nType "help" to see available commands.` }
      ];
      setTimeout(() => focusInput(), 100);
    }, 800);
  };

  const onLoginKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleCommand = (cmd) => {
    const trimmed = cmd.trim();
    const promptPath = currentPath.join('/');
    if (!trimmed) {
      commandHistory = [...commandHistory, { type: 'command', text: `${username}@x0thra:${promptPath}$ ` }];
      return;
    }

    commandHistory = [...commandHistory, { type: 'command', text: `${username}@x0thra:${promptPath}$ ${trimmed}` }];
    
    const args = trimmed.split(' ').filter(Boolean);
    const mainCommand = args[0].toLowerCase();

    let output = '';
    let isHtml = false;
    
    const currentDirObj = getDir(currentPath);

    switch (mainCommand) {
      case 'help':
        output = 'Available commands:\n  help   - Show this message\n  ls     - List files and directories\n  cd     - Change directory\n  pwd    - Print working directory\n  cat    - View file content\n  clear  - Clear terminal\n  whoami - Print current user\n  matrix - ???';
        break;
      case 'ls':
        if (currentDirObj) {
          output = Object.keys(currentDirObj.contents).map(k => {
            return currentDirObj.contents[k].type === 'dir' ? `<span class="text-blue-400">${k}/</span>` : k;
          }).join('   ');
          isHtml = true;
        }
        break;
      case 'cd':
        const targetDir = args[1];
        if (!targetDir || targetDir === '~') {
          currentPath = ['~'];
        } else if (targetDir === '..') {
          if (currentPath.length > 1) {
            currentPath.pop();
            currentPath = [...currentPath]; // trigger reactivity
          }
        } else {
          if (currentDirObj && currentDirObj.contents[targetDir]) {
            if (currentDirObj.contents[targetDir].type === 'dir') {
              currentPath = [...currentPath, targetDir];
            } else {
              output = `cd: ${targetDir}: Not a directory`;
            }
          } else {
            output = `cd: ${targetDir}: No such file or directory`;
          }
        }
        break;
      case 'pwd':
        output = '/' + (currentPath.length > 1 ? currentPath.slice(1).join('/') : '');
        break;
      case 'cat':
      case 'view':
        if (args.length < 2) {
          output = `Usage: ${mainCommand} <filename>`;
        } else {
          const filename = args[1];
          if (currentDirObj && currentDirObj.contents[filename]) {
            if (currentDirObj.contents[filename].type === 'file') {
              output = currentDirObj.contents[filename].text;
              isHtml = currentDirObj.contents[filename].isHtml || false;
            } else {
              output = `cat: ${filename}: Is a directory`;
            }
          } else {
            output = `${mainCommand}: ${filename}: No such file or directory`;
          }
        }
        break;
      case 'clear':
        commandHistory = [];
        currentInput = '';
        return;
      case 'whoami':
        output = `${username}\n(You just told me this a second ago.)`;
        break;
      case 'sudo':
        output = `${username} is not in the sudoers file. This incident will be reported.`;
        break;
      case 'matrix':
        startMatrix();
        currentInput = '';
        return;
      default:
        output = `Command not found: ${mainCommand}. Type "help" for a list of commands.`;
    }

    if (output) {
      commandHistory = [...commandHistory, { type: 'output', text: output, isHtml }];
    }
    
    currentInput = '';
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand(currentInput);
    }
  };

  onMount(() => {
    if (!isLoggedIn && loginInputEl) {
      loginInputEl.focus();
    }

    const triggerPunishment = () => {
      const messages = [
        "no.", 
        "Nuh uh.", 
        "Nope.", 
        "I'm good.", 
        "Nice try.",
        "Connection terminated.",
        "Mind your own business.",
        "Segmentation fault (core dumped).",
        "Connection refused by host.",
        "403 Forbidden. Bye."
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      
      document.body.innerHTML = `
        <div style="height: 100vh; width: 100vw; background: black; color: #a78bfa; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 2.5rem; font-weight: bold; margin: 0; padding: 0;">
          ${randomMsg}
        </div>
      `;
      
      setTimeout(() => {
        window.close();
        window.location.href = "about:blank";
      }, 500);
    };

    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('keydown', e => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        triggerPunishment();
        return false;
      }
    });

    const detectDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 200 || heightDiff > 200) {
        triggerPunishment();
      }
    };
    
    window.addEventListener('resize', detectDevTools);
    setInterval(detectDevTools, 500);
  });

  afterUpdate(() => {
    if (isLoggedIn) {
      if (terminalContainer) {
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
    }
  });

  const focusInput = () => {
    if (isLoggedIn && inputElement) {
      inputElement.focus();
    } else if (!isLoggedIn && loginInputEl) {
      loginInputEl.focus();
    }
  };
</script>

<svelte:head>
  <title>{isLoggedIn ? `${username}@x0thra:~` : "x0thra's page"}</title>
</svelte:head>

<svelte:window on:keydown={onGlobalKeyDown} />

{#if isMatrixMode}
  <canvas bind:this={matrixCanvas} class="fixed top-0 left-0 w-full h-full z-50 bg-black cursor-none"></canvas>
{/if}

{#if !isLoggedIn}
  <main class="min-h-screen bg-black text-gray-300 font-mono p-6 cursor-text" on:click={focusInput} aria-hidden="true">
    <div class="max-w-3xl">
      <p class="mb-4 text-gray-400">Arch Linux 7.0.5-arch1-1 (tty1)</p>
      
      {#each failedLogins as failedUser}
        <div class="flex flex-col mb-1">
          <span>x0thra-server login: {failedUser}</span>
          <span class="text-gray-400">Login incorrect (this is not a real server login. just type your own username)</span>
        </div>
      {/each}

      {#if !isLoggingIn}
        <div class="flex items-center">
          <span class="mr-2">x0thra-server login:</span>
          <input 
            bind:this={loginInputEl}
            bind:value={loginInput}
            on:keydown={onLoginKeyDown}
            type="text" 
            class="flex-1 bg-transparent outline-none border-none text-gray-300 focus:ring-0 p-0 m-0 shadow-none caret-gray-300"
            spellcheck="false"
            autocomplete="off"
            autofocus
          />
        </div>
      {:else}
        <div class="flex flex-col">
          <span>x0thra-server login: {loginInput}</span>
          <span class="mt-2 text-gray-500">authenticating...</span>
        </div>
      {/if}
    </div>
  </main>
{:else}
  <main class="min-h-screen bg-black text-gray-300 font-mono p-6 selection:bg-purple-900 selection:text-white flex flex-col" on:click={focusInput} aria-hidden="true">
    <div bind:this={terminalContainer} class="flex-1 w-full overflow-y-auto whitespace-pre-wrap text-sm md:text-[15px] leading-relaxed cursor-text pb-10">
      {#each commandHistory as line}
        <div class="mb-3">
          {#if line.type === 'command'}
            <span class="text-[#a78bfa]">{line.text}</span>
          {:else if line.isHtml}
            <span class="text-gray-400">{@html line.text}</span>
          {:else}
            <span class="text-gray-400">{line.text}</span>
          {/if}
        </div>
      {/each}

      <div class="flex items-center mt-3">
        <span class="text-[#a78bfa] mr-3 whitespace-nowrap">{username}@x0thra:{currentPath.join('/')}$</span>
        <input 
          bind:this={inputElement}
          bind:value={currentInput}
          on:keydown={onKeyDown}
          type="text" 
          class="flex-1 bg-transparent outline-none border-none text-gray-300 focus:ring-0 p-0 m-0 shadow-none caret-[#a78bfa]"
          spellcheck="false"
          autocomplete="off"
        />
      </div>
    </div>
  </main>
{/if}

<style>
  div::-webkit-scrollbar {
    width: 8px;
  }
  div::-webkit-scrollbar-track {
    background: transparent;
  }
  div::-webkit-scrollbar-thumb {
    background: #2a2a35;
    border-radius: 4px;
  }
  div::-webkit-scrollbar-thumb:hover {
    background: #3f3f5a;
  }
</style>
