document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('sticky');
    } else {
      nav.classList.remove('sticky');
    }
  });

  const ctaButton = document.querySelector('.cta[data-target]');

  if (ctaButton) {
    ctaButton.addEventListener('click', () => {
      const targetId = ctaButton.getAttribute('data-target');
      const target = document.getElementById(targetId);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll('section, .footer, .nav').forEach((el) => observer.observe(el));

  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('active'));
  });

  const waitlistForm = document.querySelector('.waitlist-form');
  waitlistForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const existing = document.querySelector('.success');
    if (!existing) {
      const message = document.createElement('p');
      message.className = 'success';
      message.textContent = "you're on the list 🧡";
      message.setAttribute('role', 'status');
      waitlistForm.after(message);
    }
    waitlistForm.reset();
  });

  const chatToggle = document.getElementById('chatToggle');
  const chatPanel = document.getElementById('chatPanel');
  const chatClose = document.getElementById('chatClose');
  const chatForm = document.getElementById('chatForm');
  const chatMessages = document.getElementById('chatMessages');

  // Chatflow-inspired config
  const SYSTEM_MESSAGE =
    'The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.';
  const MAX_MEMORY = 10;
  const memoryWindow = [];

  const knowledgeFallbacks = [
    ['Nice! We logged your idea.', 'We will send a peek at what is in the queue.'],
    ['Thanks for sharing.', 'We take the vote seriously and will highlight it in the next drop.'],
    ['Good call.', 'The next batch of activities will reflect that vibe. Stay tuned!'],
    ['Lovely! That sounds like a Planzi moment.', 'We are matching it with similar energy and will ping you when the plan lands.'],
  ];

  let typingIndicator = null;

  const showTyping = () => {
    hideTyping();
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-bubble bot typing';
    typingIndicator.textContent = 'Planzi is thinking...';
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const hideTyping = () => {
    if (typingIndicator) {
      typingIndicator.remove();
      typingIndicator = null;
    }
  };

  const toggleChat = () => {
    const isOpen = chatPanel.classList.toggle('visible');
    chatPanel.setAttribute('aria-hidden', (!isOpen).toString());
    if (isOpen) {
      chatToggle.focus();
    }
  };

  chatToggle.addEventListener('click', toggleChat);
  chatClose.addEventListener('click', toggleChat);

  const appendMessage = (text, sender = 'bot') => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const remember = (role, text) => {
    memoryWindow.push({ role, text });
    if (memoryWindow.length > MAX_MEMORY) {
      memoryWindow.shift();
    }
  };

  const buildMessages = (userText) => {
    const history = memoryWindow
      .slice(-MAX_MEMORY)
      .map((item) => ({ role: item.role, content: item.text }));
    return [{ role: 'system', content: SYSTEM_MESSAGE }, ...history, { role: 'user', content: userText }];
  };

  const groqConfig = {
    apiKey: 'X9AA4wuZTwxRCh1s_1F5L-yVkn3LqumHS_Ai2DpFFfw',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0.5,
  };

  const callGroq = async (messages) => {
    if (!groqConfig.apiKey) return null;
    try {
      const response = await fetch(groqConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: groqConfig.model,
          messages,
          temperature: groqConfig.temperature,
          stream: false,
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      return content ? [content] : null;
    } catch (err) {
      console.error('Groq chat error', err);
      return null;
    }
  };

  const fallbackResponse = () => knowledgeFallbacks[Math.floor(Math.random() * knowledgeFallbacks.length)];

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = chatForm.querySelector('input');
    if (!input.value.trim()) return;
    const userText = input.value.trim();
    appendMessage(userText, 'user');
    remember('user', userText);
    input.value = '';
    chatToggle.textContent = 'Chat with Planzi';
    showTyping();

    const messages = buildMessages(userText);

    callGroq(messages).then((remoteReply) => {
      const lines = remoteReply || fallbackResponse();
      lines.forEach((line, index) => {
        setTimeout(() => {
          appendMessage(line, 'bot');
          remember('bot', line);
          if (index === lines.length - 1) {
            hideTyping();
          }
        }, 900 + index * 600);
      });
    });
  });
});
