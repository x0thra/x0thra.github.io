<script>
  import { onMount, afterUpdate } from 'svelte';
  
  let isLoggedIn = false;
  let isLoggingIn = false;
  let loginInput = '';
  let loginInputEl;
  let username = 'guest';

  $: loginInput = loginInput.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);

  const DISCORD_WEBHOOK_URL = 'https://green-bread-f7b4.x0thra.workers.dev/';

  let commandHistory = [];
  let currentInput = '';
  let inputElement;
  let terminalContainer;

  const fileSystem = {
    'about.txt': { text: 'Name: x0thra\nAge: 19\nSign: Cancer\nPersonality: ISFP-T 9w1\n\nActivities:\nMost of my time is spent diving into games, writing code, and getting lost in music.\nIt\'s how I prefer to disconnect from the noise.' },
    'thoughts.txt': { text: '"Observation over interaction. Keeping things minimal and quiet."' },
    'socials.txt': { 
      text: 'GitHub:    <a href="https://github.com/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">github.com/x0thra</a>\nX:         <a href="https://x.com/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">x.com/x0thra</a>\nInstagram: <a href="https://instagram.com/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">instagram.com/x0thra</a>',
      isHtml: true
    }
  };

  const handleLogin = async () => {
    const trimmedUser = loginInput.trim();
    if (!trimmedUser) return;
    
    username = trimmedUser.toLowerCase().replace(/\s+/g, '_');
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
    if (!trimmed) {
      commandHistory = [...commandHistory, { type: 'command', text: `${username}@x0thra:~$ ` }];
      return;
    }

    commandHistory = [...commandHistory, { type: 'command', text: `${username}@x0thra:~$ ${trimmed}` }];
    
    const args = trimmed.split(' ').filter(Boolean);
    const mainCommand = args[0].toLowerCase();

    let output = '';
    let isHtml = false;

    switch (mainCommand) {
      case 'help':
        output = 'Available commands:\n  help   - Show this message\n  ls     - List files\n  cat    - View file content (e.g., cat about.txt)\n  clear  - Clear terminal\n  whoami - Print current user';
        break;
      case 'ls':
        output = Object.keys(fileSystem).join('   ');
        break;
      case 'cat':
      case 'view':
        if (args.length < 2) {
          output = `Usage: ${mainCommand} <filename>`;
        } else {
          const filename = args[1];
          if (fileSystem[filename]) {
            output = fileSystem[filename].text;
            isHtml = fileSystem[filename].isHtml || false;
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

    // --- ANTI-DEVTOOLS PROTECTION ---
    // Ceza Sistemi: Sayfayı silip mesaj gösterir, sonra sekmeyi kapatır
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
        window.close(); // Sadece script ile açılan pencerelerde çalışır
        window.location.href = "about:blank"; // Kapatamazsa boş sayfaya yönlendirir
      }, 500);
    };

    // 1. Sağ tık engelleme (Sağ tıka da ceza verebiliriz ama belki yanlışlıkla basarlar diye sadece engelliyoruz)
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 2. Klavye Kısayolları (F12, İncele, View Source) basıldığı an cezayı keser!
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

    // 3. DevTools Boyut Tuzağı (Event ve Polling tabanlı, debugger YOK)
    const detectDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 200 || heightDiff > 200) {
        triggerPunishment();
      }
    };
    
    // Pencere yeniden boyutlandırıldığında (DevTools açılırken) anında tetikle
    window.addEventListener('resize', detectDevTools);
    
    // Her ihtimale karşı sessizce arkada kontrol et
    setInterval(detectDevTools, 500);
  });

  afterUpdate(() => {
    if (isLoggedIn && terminalContainer) {
      terminalContainer.scrollTop = terminalContainer.scrollHeight;
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

{#if !isLoggedIn}
  <main class="min-h-screen bg-black text-gray-300 font-mono p-6 cursor-text" on:click={focusInput} aria-hidden="true">
    <div class="max-w-3xl">
      <p class="mb-4 text-gray-400">Arch Linux 7.0.5-arch1-1 (tty1)</p>
      
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
        <span class="text-[#a78bfa] mr-3 whitespace-nowrap">{username}@x0thra:~$</span>
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
