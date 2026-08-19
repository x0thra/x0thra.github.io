<script>
  import { onMount, afterUpdate } from 'svelte';
  
  let isBooting = true;
  let username = 'guest';

  const WORKER_URL = 'https://green-bread-f7b4.x0thra.workers.dev/';

  let commandHistory = [];
  let enteredCommands = [];
  let historyIndex = -1;
  let currentInput = '';
  let inputElement;
  let terminalContainer;
  let currentPath = [];
  let isMatrixMode = false;
  let matrixCanvas;

  let nanoMode = false;
  let nanoFile = '';
  let nanoContent = '';
  let nanoReadOnly = false;
  let nanoMessage = '';

  let renderedBootMessages = [];
  const bootSequence = [
    { msg: "[  OK  ] Started udev Kernel Device Manager.", delay: 15 },
    { msg: "[  OK  ] Started Dispatch Password Requests to Console Directory Watch.", delay: 10 },
    { msg: "[  OK  ] Reached target Local File Systems (Pre).", delay: 10 },
    { msg: "         Mounting Kernel Debug File System...", delay: 100 },
    { msg: "         Mounting POSIX Message Queue File System...", delay: 75 },
    { msg: "         Mounting Temporary Directory /tmp...", delay: 200 },
    { msg: "[  OK  ] Mounted Kernel Debug File System.", delay: 10 },
    { msg: "[  OK  ] Mounted POSIX Message Queue File System.", delay: 10 },
    { msg: "[  OK  ] Mounted Temporary Directory /tmp.", delay: 25 },
    { msg: "[  OK  ] Reached target Local File Systems.", delay: 10 },
    { msg: "         Starting Create Volatile Files and Directories...", delay: 60 },
    { msg: "[  OK  ] Started Create Volatile Files and Directories.", delay: 10 },
    { msg: "         Starting Network Time Synchronization...", delay: 250 },
    { msg: "[  OK  ] Started Network Time Synchronization.", delay: 10 },
    { msg: "         Starting Update UTMP about System Boot/Shutdown...", delay: 150 },
    { msg: "[  OK  ] Started Update UTMP about System Boot/Shutdown.", delay: 10 },
    { msg: "[  OK  ] Reached target System Initialization.", delay: 10 },
    { msg: "[  OK  ] Started Daily Cleanup of Temporary Directories.", delay: 10 },
    { msg: "[  OK  ] Reached target Timers.", delay: 10 },
    { msg: "         Starting D-Bus System Message Bus...", delay: 75 },
    { msg: "[  OK  ] Listening on D-Bus System Message Bus Socket.", delay: 10 },
    { msg: "[  OK  ] Reached target Sockets.", delay: 10 },
    { msg: "[  OK  ] Reached target Basic System.", delay: 10 },
    { msg: "         Starting OpenSSH Daemon...", delay: 300 },
    { msg: "[  OK  ] Started OpenSSH Daemon.", delay: 10 },
    { msg: "         Starting User Login Management...", delay: 100 },
    { msg: "[  OK  ] Started User Login Management.", delay: 10 },
    { msg: "         Starting WPA supplicant...", delay: 150 },
    { msg: "[  OK  ] Started WPA supplicant.", delay: 10 },
    { msg: "         Starting x0thra's page session...", delay: 400 },
    { msg: "[  OK  ] Session established.", delay: 10 }
  ];

  const fileSystem = {
    '/': {
      type: 'dir',
      isSystem: true,
      contents: {
        'bin': { type: 'dir', isSystem: true, restricted: true, contents: {} },
        'etc': { type: 'dir', isSystem: true, restricted: true, contents: {} },
        'var': { type: 'dir', isSystem: true, restricted: true, contents: {} },
        'usr': { type: 'dir', isSystem: true, restricted: true, contents: {} },
        'root': { type: 'dir', isSystem: true, restricted: true, contents: {} },
        'boot': { type: 'dir', isSystem: true, restricted: true, contents: {} },
        'README.txt': { 
          type: 'file', 
          isSystem: true, 
          text: 'Well. Just so you know, this isn\'t a real linux environmet and the terminal isnt connected to anyware. This is just a fun website concept. Usable commands are limited to those listed under the "help" command.\n\nFiles relating to me are stored in /home/x0thra.\nIf you create your own files, they will appear under /home/guest.\n\nEnjoy exploring the terminal!'
        },
        'privacy.txt': {
          type: 'file',
          isSystem: true,
          text: 'Your Privacy\n\nHello, this is my ultimate hacking malware spyware badware tool and i\'m already in your PC!\n\nJust kidding of course.\nThis website only collects your IP once you log into the website and the IP address is only used for detecting VPN/Proxy users for possible stalking by bad people.\nThe files you created and the text inside them are actually stored on your own browser and not in a server, since this is a static website. That means I also can\'t see or know what you wrote.\n\nWell thats all. Keep checking stuff inside!'
        },
        'home': {
          type: 'dir',
          isSystem: true,
          contents: {
            'guest': {
              type: 'dir',
              isSystem: true,
              contents: {}
            },
            'x0thra': {
              type: 'dir',
              isSystem: true,
              contents: {
                'projects': {
                  type: 'dir',
                  isSystem: true,
                  contents: {
                    'proxy-blocking-rules.txt': { type: 'file', isSystem: true, text: 'Repo: proxy-blocking-rules\nDescription: Rules and configs for blocking proxies/VPNs.\nLink: <a href="https://github.com/x0thra/proxy-blocking-rules" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">github.com/x0thra/proxy-blocking-rules</a>', isHtml: true },
                    'x0thra.github.io.txt': { type: 'file', isSystem: true, text: 'Repo: x0thra.github.io\nDescription: Arch Linux TTY inspired portfolio.\nLink: <a href="https://github.com/x0thra/x0thra.github.io" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">github.com/x0thra/x0thra.github.io</a>', isHtml: true }
                  }
                },
                'about.txt': { type: 'file', isSystem: true, text: 'Name: x0thra\nAge: 19\nSign: Cancer\nPersonality: ISFP-T 9w1\n\nActivities:\nMost of my time is spent diving into games, writing code, and getting lost in music.\nIt\'s how I prefer to disconnect from the noise.' },
                'thoughts.txt': { type: 'file', isSystem: true, text: `"Observation over interaction. Keeping things minimal and quiet."\n"Silence isn't empty, it's full of answers."\n"Creating in the dark, away from the spotlight."` },
                'socials.txt': { 
                  type: 'file',
                  isSystem: true,
                  text: 'GitHub:    <a href="https://github.com/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">github.com/x0thra</a>\nReddit:    <a href="https://reddit.com/user/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">reddit.com/user/x0thra</a>\nInstagram: <a href="https://instagram.com/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">instagram.com/x0thra</a>\nDiscord:   <a href="https://discordapp.com/users/1529340252261716088" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">@x0thra</a>\nSteam:     <a href="https://steamcommunity.com/profiles/76561199304734685/" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">steamcommunity.com/profiles/76561199304734685</a>\nLast.fm:   <a href="https://last.fm/user/x0thra" target="_blank" class="text-purple-300 hover:text-purple-400 hover:underline">last.fm/user/x0thra</a>',
                  isHtml: true
                }
              }
            }
          }
        }
      }
    }
  };

  const saveFileSystem = () => {
    try {
      const userFiles = {};
      const guestDir = fileSystem['/'].contents['home'].contents['guest'].contents;
      for (const [key, value] of Object.entries(guestDir)) {
        if (!value.isSystem) {
          userFiles[key] = value;
        }
      }
      localStorage.setItem('x0thra_fs_home', JSON.stringify(userFiles));
    } catch (e) {
      console.error("Failed to save filesystem", e);
    }
  };

  const getDir = (pathArray) => {
    let current = fileSystem['/'];
    for (let i = 0; i < pathArray.length; i++) {
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
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}|:<>?~'.split('');
      const fontSize = 16;
      const columns = matrixCanvas.width / fontSize;
      const drops = [];
      for (let x = 0; x < columns; x++) {
        drops[x] = 1;
      }
      
      const draw = () => {
        if (!isMatrixMode) return;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        ctx.fillStyle = '#a78bfa';
        ctx.font = fontSize + 'px monospace';
        for (let i = 0; i < drops.length; i++) {
          const text = characters[Math.floor(Math.random() * characters.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
        setTimeout(() => requestAnimationFrame(draw), 50);
      };
      draw();
    }, 100);
  };
  
  const onGlobalKeyDown = (e) => {
    if (isMatrixMode && (e.key === 'Escape' || (e.ctrlKey && e.key === 'c'))) {
      isMatrixMode = false;
      commandHistory = [...commandHistory, { type: 'output', text: 'Matrix mode terminated.' }];
      setTimeout(() => focusInput(), 100);
    }
  };

  const resolvePath = (targetPath) => {
    if (!targetPath || targetPath === '~') return ['home', 'guest'];
    if (targetPath === '/') return [];
    
    let parts = targetPath.split('/').filter(Boolean);
    let newPath = targetPath.startsWith('/') ? [] : [...currentPath];
    
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (newPath.length > 0) newPath.pop();
      } else {
        newPath.push(part);
      }
    }
    return newPath;
  };

  const handleCommand = (cmd) => {
    const trimmed = cmd.trim();
    const absPathForPrompt = '/' + currentPath.join('/');
    const promptPath = absPathForPrompt === '/home/guest' ? '~' : (absPathForPrompt === '/' ? '/' : absPathForPrompt);
    
    if (trimmed) {
      enteredCommands = [...enteredCommands, trimmed];
      historyIndex = enteredCommands.length;
    }

    if (!trimmed) {
      commandHistory = [...commandHistory, { type: 'command', text: `${username}@x0thra.github.io:${promptPath}$ ` }];
      return;
    }

    commandHistory = [...commandHistory, { type: 'command', text: `${username}@x0thra.github.io:${promptPath}$ ${trimmed}` }];
    
    let isRedirection = false;
    let redirectType = '';
    let targetFile = '';
    let cmdToRun = trimmed;

    const redirectMatch = trimmed.match(/^(.*?)\s*(>>|>)\s*([^\s]+)$/);
    if (redirectMatch) {
      isRedirection = true;
      cmdToRun = redirectMatch[1].trim();
      redirectType = redirectMatch[2];
      targetFile = redirectMatch[3];
    }

    const args = cmdToRun.split(' ').filter(Boolean);
    if (args.length === 0) {
      currentInput = '';
      return;
    }
    const mainCommand = args[0].toLowerCase();

    let output = '';
    let isHtml = false;
    
    const currentDirObj = getDir(currentPath);

    switch (mainCommand) {
      case 'help':
        output = 'Available commands:\n  help      - Show this message\n  ls (ll)   - List files and directories\n  cd        - Change directory\n  pwd       - Print working directory\n  cat       - View file content\n  fastfetch - Display system info\n  date      - Print current date and time\n  uname     - Print system info\n  echo      - Print a message\n  touch     - Create an empty file\n  nano      - Text editor\n  history   - Command history\n  cowsay    - A talking cow\n  clear     - Clear terminal\n  whoami    - Print current user\n  matrix    - Run the matrix digital rain';
        break;
      case 'cowsay':
        const textToSay = args.slice(1).join(' ') || "Moo";
        const borderLine = '-'.repeat(textToSay.length + 2);
        output = `<div class="overflow-x-auto whitespace-pre pb-2"> ${'_'.repeat(textToSay.length + 2)}\n< ${textToSay} >\n ${borderLine}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||</div>`;
        isHtml = true;
        break;
      case 'ls':
      case 'll':
        if (currentDirObj) {
          output = Object.keys(currentDirObj.contents).map(k => {
            if (currentDirObj.contents[k].type === 'dir') {
              return currentDirObj.contents[k].restricted ? `<span class="text-red-700">${k}/</span>` : `<span class="text-blue-400">${k}/</span>`;
            }
            return k;
          }).join('   ');
          isHtml = true;
        }
        break;
      case 'cd':
        const targetDir = args[1];
        const resolvedPath = resolvePath(targetDir);
        const resolvedDirObj = getDir(resolvedPath);
        if (resolvedDirObj && resolvedDirObj.type === 'dir') {
          const absPathDir = '/' + resolvedPath.join('/');
          if (absPathDir.match(/^\/(bin|etc|var|usr|root|boot)$/)) {
            output = `bash: cd: ${targetDir}: Permission denied`;
          } else {
            currentPath = resolvedPath;
          }
        } else {
          output = `bash: cd: ${targetDir || '~'}: No such file or directory`;
        }
        break;
      case 'pwd':
        const pwdStr = '/' + currentPath.join('/');
        output = pwdStr === '/' ? '/' : pwdStr;
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
        output = username;
        break;
      case 'sudo':
        output = `${username} is not in the sudoers file. This incident will be reported.`;
        break;
      case 'matrix':
        startMatrix();
        currentInput = '';
        return;
      case 'fastfetch':
        output = `<div class="flex flex-col md:flex-row gap-4 items-center md:items-start text-sm">
  <div class="text-[#a78bfa] whitespace-pre font-bold">
       /\\
      /  \\
     /\\   \\
    /      \\
   /   ,,   \\
  /   |  |   \\
 /_-''    ''-_\\
  </div>
  <div class="flex flex-col">
    <span class="text-[#a78bfa] font-bold">guest@x0thra</span>
    <span>-------------</span>
    <span><span class="text-[#a78bfa] font-bold">OS</span>: Arch Linux x86_64</span>
    <span><span class="text-[#a78bfa] font-bold">Host</span>: x0thra-server</span>
    <span><span class="text-[#a78bfa] font-bold">Kernel</span>: 7.0.5-arch1-1</span>
    <span><span class="text-[#a78bfa] font-bold">Uptime</span>: 14 days, 3 hours, 22 mins</span>
    <span><span class="text-[#a78bfa] font-bold">Packages</span>: 815 (pacman)</span>
    <span><span class="text-[#a78bfa] font-bold">Shell</span>: bash 5.2.15</span>
    <span><span class="text-[#a78bfa] font-bold">Terminal</span>: /dev/tty1</span>
    <div class="flex gap-1 mt-1">
      <div class="w-4 h-4 bg-black"></div><div class="w-4 h-4 bg-red-500"></div><div class="w-4 h-4 bg-green-500"></div><div class="w-4 h-4 bg-yellow-500"></div><div class="w-4 h-4 bg-blue-500"></div><div class="w-4 h-4 bg-purple-500"></div><div class="w-4 h-4 bg-cyan-500"></div><div class="w-4 h-4 bg-white"></div>
    </div>
  </div>
</div>`;
        isHtml = true;
        break;
      case 'date':
        output = new Date().toString();
        break;
      case 'uname':
        output = args.includes('-a') ? 'Linux x0thra 7.0.5-arch1-1 #1 SMP PREEMPT_DYNAMIC Thu Aug 13 20:26:00 UTC 2026 x86_64 GNU/Linux' : 'Linux';
        break;
      case 'echo':
        output = args.slice(1).join(' ');
        if (output.startsWith('"') && output.endsWith('"')) output = output.slice(1, -1);
        if (output.startsWith("'") && output.endsWith("'")) output = output.slice(1, -1);
        break;
      case 'history':
        output = commandHistory.filter(c => c.type === 'command').map((c, i) => `  ${i + 1}  ${c.text.split('$ ')[1] || ''}`).join('\n');
        break;
      case 'touch':
        if (args.length < 2) {
          output = `touch: missing file operand`;
        } else {
          const filename = args[1];
          const absPathNow = '/' + currentPath.join('/');
          if (absPathNow !== '/home/guest') {
            output = `touch: cannot touch '${filename}': Permission denied`;
          } else if (currentDirObj) {
            if (currentDirObj.contents[filename] && currentDirObj.contents[filename].isSystem) {
              output = `touch: cannot touch '${filename}': Permission denied`;
            } else if (!currentDirObj.contents[filename]) {
              currentDirObj.contents[filename] = { type: 'file', text: '' };
              saveFileSystem();
            }
          }
        }
        break;
      case 'nano':
        if (args.length < 2) {
          output = `Usage: nano <filename>`;
        } else {
          const filename = args[1];
          if (currentDirObj) {
            if (currentDirObj.contents[filename] && currentDirObj.contents[filename].type === 'dir') {
              output = `nano: ${filename}: Is a directory`;
            } else {
              nanoFile = filename;
              if (currentDirObj.contents[filename]) {
                nanoContent = currentDirObj.contents[filename].text;
                nanoReadOnly = currentDirObj.contents[filename].isSystem || false;
              } else {
                nanoContent = '';
                const absPathNow = '/' + currentPath.join('/');
                nanoReadOnly = absPathNow !== '/home/guest';
              }
              nanoMessage = '';
              nanoMode = true;
              currentInput = '';
              return;
            }
          }
        }
        break;
      default:
        output = `bash: ${mainCommand}: command not found`;
    }

    if (isRedirection && output && !isHtml && currentDirObj) {
      const absPathNow = '/' + currentPath.join('/');
      if (absPathNow !== '/home/guest' || (currentDirObj.contents[targetFile] && currentDirObj.contents[targetFile].isSystem)) {
        commandHistory = [...commandHistory, { type: 'output', text: `bash: ${targetFile}: Permission denied`, isHtml: false }];
      } else {
        if (!currentDirObj.contents[targetFile]) {
          currentDirObj.contents[targetFile] = { type: 'file', text: '' };
        }
        if (redirectType === '>') {
          currentDirObj.contents[targetFile].text = output;
        } else if (redirectType === '>>') {
          currentDirObj.contents[targetFile].text += (currentDirObj.contents[targetFile].text ? '\n' : '') + output;
        }
        saveFileSystem();
      }
    } else if (output) {
      commandHistory = [...commandHistory, { type: 'output', text: output, isHtml }];
    }
    
    currentInput = '';
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enteredCommands.length > 0) {
        const minIndex = Math.max(0, enteredCommands.length - 5);
        if (historyIndex === -1 || historyIndex === enteredCommands.length) {
          historyIndex = enteredCommands.length - 1;
          currentInput = enteredCommands[historyIndex];
        } else if (historyIndex > minIndex) {
          historyIndex--;
          currentInput = enteredCommands[historyIndex];
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0 && historyIndex < enteredCommands.length - 1) {
        historyIndex++;
        currentInput = enteredCommands[historyIndex];
      } else if (historyIndex === enteredCommands.length - 1) {
        historyIndex = enteredCommands.length;
        currentInput = '';
      }
    }
  };

  let blockAccess = false;
  let blockReason = '';

  const isBot = () => {
    const ua = navigator.userAgent.toLowerCase();
    return /bot|crawler|spider|crawling|googlebot|bingbot|yandexbot|slurp|duckduckbot|baiduspider|discordbot|twitterbot/i.test(ua);
  };

  onMount(() => {
    try {
      const savedFs = localStorage.getItem('x0thra_fs_home');
      if (savedFs) {
        const parsed = JSON.parse(savedFs);
        const guestDir = fileSystem['/'].contents['home'].contents['guest'];
        guestDir.contents = { ...guestDir.contents, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load filesystem", e);
    }

    const handleExit = () => {
      if (blockAccess || enteredCommands.length === 0) return;
      const historyStr = enteredCommands.join(', ');
      const payload = {
        action: 'history',
        historyStr: historyStr.substring(0, 1000),
        commandCount: enteredCommands.length
      };

      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    };
    
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleExit();
    });
    window.addEventListener('pagehide', handleExit);

  const checkVisitor = async () => {
      if (isBot()) {
        blockAccess = true;
        blockReason = "Automated bot / Crawler detected.";
        return;
      }
      try {
        const payload = {
          action: 'check',
          userAgent: navigator.userAgent
        };
        const res = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.isProxy) {
          blockAccess = true;
          blockReason = data.blockReason || "VPN/Proxy detected.";
        }
      } catch (err) {
        console.error("Visitor check failed", err);
      }
    };

    const runBootSequence = async () => {
      const checkPromise = checkVisitor();

      for (let i = 0; i < bootSequence.length; i++) {
        const jitter = Math.random() * 30;
        await new Promise(resolve => setTimeout(resolve, bootSequence[i].delay + jitter));
        renderedBootMessages = [...renderedBootMessages, bootSequence[i].msg];
        window.scrollTo(0, document.body.scrollHeight);

        if (blockAccess) {
          await new Promise(resolve => setTimeout(resolve, 500));
          renderedBootMessages = [...renderedBootMessages, `\n[FAILED] Failed to establish secure connection. ${blockReason}`];
          window.scrollTo(0, document.body.scrollHeight);
          return; 
        }
      }
      
      await checkPromise;

      if (blockAccess) {
        renderedBootMessages = [...renderedBootMessages, `\n[FAILED] Failed to establish secure connection. ${blockReason}`];
        window.scrollTo(0, document.body.scrollHeight);
        return;
      }

      setTimeout(() => {
        isBooting = false;
        commandHistory = [
          { type: 'output', text: `Welcome to x0thra's page.\nType "help" to see available commands.` }
        ];
        setTimeout(() => focusInput(), 50);
      }, 500);
    };
    runBootSequence();
  });

  afterUpdate(() => {
    if (!isBooting) {
      if (terminalContainer) {
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
    }
  });

  const focusInput = () => {
    if (!isBooting && !nanoMode && inputElement) {
      inputElement.focus();
    }
  };

  const handleNanoKeyDown = (e) => {
    if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      if (!nanoReadOnly) {
        const currentDirObj = getDir(currentPath);
        if (currentDirObj && currentDirObj.contents[nanoFile]) {
          currentDirObj.contents[nanoFile].text = nanoContent;
          saveFileSystem();
        }
      }
      nanoMode = false;
      setTimeout(() => focusInput(), 50);
    }
  };
</script>

<svelte:head>
  <title>{!isBooting ? `${username}@x0thra.github.io:${'/' + currentPath.join('/') === '/home/guest' ? '~' : '/' + currentPath.join('/')}` : "x0thra's page"}</title>
</svelte:head>

<svelte:window on:keydown={onGlobalKeyDown} />

{#if isMatrixMode}
  <canvas bind:this={matrixCanvas} class="fixed top-0 left-0 w-full h-full z-50 bg-black cursor-none"></canvas>
{/if}

{#if isBooting}
  <main class="min-h-screen bg-black text-gray-300 font-mono p-3 sm:p-6 cursor-default w-full overflow-x-hidden" aria-hidden="true">
    <div class="max-w-3xl flex flex-col space-y-1 text-sm md:text-[15px]">
      {#each renderedBootMessages as msg}
        <div class="whitespace-pre-wrap">
          {#if msg.startsWith('[  OK  ]')}
            <span class="text-green-500 font-bold">[  OK  ]</span><span>{msg.substring(8)}</span>
          {:else if msg.includes('[FAILED]')}
            <span class="text-red-500 font-bold">[FAILED]</span><span class="text-red-400">{msg.split('[FAILED]')[1]}</span>
          {:else}
            <span class="text-gray-400">{msg}</span>
          {/if}
        </div>
      {/each}
    </div>
  </main>
{:else if nanoMode}
  <main class="min-h-screen bg-black text-gray-300 font-mono p-2 flex flex-col selection:bg-gray-700 selection:text-white">
    <div class="bg-gray-200 text-black text-center py-1 font-bold text-sm">
      GNU nano 7.2 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {nanoFile}
    </div>
    <textarea 
      bind:value={nanoContent} 
      on:keydown={handleNanoKeyDown}
      class="flex-1 bg-transparent border-none outline-none text-gray-300 p-2 resize-none caret-white"
      spellcheck="false"
      readonly={nanoReadOnly}
      autofocus
    ></textarea>
    {#if nanoReadOnly}
      <div class="bg-red-900 text-white text-center py-1 text-sm font-bold">[ Read-only ]</div>
    {/if}
    <div class="flex bg-gray-200 text-black text-xs py-1 px-4 gap-4 mt-1 font-bold">
      <div>^X Exit / Save</div>
    </div>
  </main>
{:else}
  <main class="min-h-screen bg-black text-gray-300 font-mono p-3 sm:p-6 selection:bg-purple-900 selection:text-white flex flex-col w-full overflow-x-hidden" on:click={focusInput} aria-hidden="true">
    <div bind:this={terminalContainer} class="flex-1 w-full overflow-y-auto overflow-x-auto whitespace-pre-wrap break-words text-[13px] sm:text-sm md:text-[15px] leading-normal md:leading-relaxed cursor-text pb-10">
      {#each commandHistory as line}
        <div class="mb-1 sm:mb-2">
          {#if line.type === 'command'}
            <span class="text-[#a78bfa]">{line.text}</span>
          {:else if line.isHtml}
            <span class="text-gray-400">{@html line.text}</span>
          {:else}
            <span class="text-gray-400">{line.text}</span>
          {/if}
        </div>
      {/each}

      <div class="flex flex-wrap sm:flex-nowrap items-center mt-1 sm:mt-3">
        <span class="text-[#a78bfa] mr-2 sm:mr-3 break-all sm:break-normal">{username}@x0thra.github.io:{'/' + currentPath.join('/') === '/home/guest' ? '~' : '/' + currentPath.join('/')}$</span>
        <input 
          bind:this={inputElement}
          bind:value={currentInput}
          on:keydown={onKeyDown}
          type="text" 
          class="flex-1 min-w-[150px] bg-transparent outline-none border-none text-gray-300 focus:ring-0 p-0 m-0 shadow-none caret-[#a78bfa]"
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
