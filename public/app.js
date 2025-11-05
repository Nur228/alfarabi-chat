// Минимальный чат: панель только "Чат" и "Очистить"
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const btnClear = document.getElementById("clear");

// История с сохранением
const saved = JSON.parse(localStorage.getItem("messages") || "null");
const messages = saved ?? [{ role: "assistant", content: "Сәлем! Қалай көмектесе аламын?", ts: Date.now() }];

renderAll();

btnClear.addEventListener("click", () => {
  messages.length = 0;
  messages.push({ role: "assistant", content: "Сәлем! Қалай көмектесе аламын?", ts: Date.now() });
  persist(); renderAll();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  pushMsg("user", text);
  input.value = "";
  renderAll();

  const typingId = pushTyping();
  try {
    // Пытаемся LLM (через /api/chat)
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "Сен ТЕК қазақ тілінде жауап бересің. Жауаптарың қысқа, нақты және түсінікті болсын.",
        messages: messages.filter(m => !m.typing).map(({ role, content }) => ({ role, content }))
      })
    });

    let reply = "";
    if (res.ok) {
      const data = await res.json();
      reply = data.reply || "Кешіріңіз, серверден жауап алмадым.";
    } else {
      // если сервер ответил ошибкой — локальный фолбэк
      reply = localKazakhReply(text);
    }

    removeTyping(typingId);
    pushMsg("assistant", reply);
  } catch (err) {
    // сеть/исключение — локальный фолбэк
    console.error(err);
    removeTyping(typingId);
    pushMsg("assistant", localKazakhReply(text));
  } finally {
    renderAll();
  }
});

function pushMsg(role, content) { messages.push({ role, content, ts: Date.now() }); persist(); }
function pushTyping() { const id = Date.now().toString(); messages.push({ role:"assistant", content:"...", typing:true, id, ts: Date.now() }); persist(); return id; }
function removeTyping(id) { const i = messages.findIndex(m => m.id === id); if (i>=0) messages.splice(i,1); persist(); }

function renderAll() {
  chat.innerHTML = "";
  for (const m of messages) {
    const isUser = m.role === "user";
    const time = new Date(m.ts || Date.now()).toLocaleTimeString();

    const bubble = document.createElement("div");
    bubble.className = `flex ${isUser ? "justify-end" : "justify-start"}`;

    const classesUser = "bg-gray-900 text-white rounded-br-sm";
    const classesBot  = "bg-gray-100 text-gray-900 rounded-bl-sm"; // ← явный тёмный текст

    bubble.innerHTML = `
      <div class="max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow ${isUser ? classesUser : classesBot}">
        <div>${escapeHtml(m.content)}</div>
        <div class="text-[10px] opacity-60 mt-1">${time}${m.typing ? " · typing…" : ""}</div>
      </div>
    `;
    chat.appendChild(bubble);
  }
  chat.lastElementChild?.scrollIntoView({ behavior: "smooth" });
}


function persist() { localStorage.setItem("messages", JSON.stringify(messages)); }

function localKazakhReply(q) {
  const t = q.toLowerCase();
  if (/^салем|сәлем|hello|hi|привет/.test(t)) return "Сәлем! Қош келдіңіз. Қалай көмектесе аламын?";
  if (/көмек|help|қалай жұмыс істейді/.test(t)) return "Мен қазақ тілінде қысқа жауап беремін. Сұрағыңызды нақты жазыңыз.";
  if (/жұмыс уақыты|режим|сағат/.test(t)) return "Біздің жұмыс уақыты: дүйсенбі–жұма, 09:00–18:00 (GMT+6).";
  if (/байланыс|телефон|email|почта/.test(t)) return "Байланыс: +7 776 660 2006, n_argynbekov@kbtu.kz";
  if (/рахмет|спасибо|thanks/.test(t)) return "Рақмет! Тағы сұрақ бар ма?";
  return "Сұрағыңызды нақтылай аласыз ба? Қысқаша, қарапайым тілмен жазыңыз.";
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const style = document.createElement("style");
style.textContent = `
  .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#9ca3af;margin-right:2px;animation:pulse 1s infinite ease-in-out}
  .dot:nth-child(2){animation-delay:.15s}
  .dot:nth-child(3){animation-delay:.3s}
  @keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}
`;
document.head.appendChild(style);

// ===== ОТКРЫТИЕ/ЗАКРЫТИЕ ЧАТА =====
const toggleBtn = document.getElementById("toggleChat");
const chatPanel = document.getElementById("chatPanel");

let isOpen = false;

toggleBtn.addEventListener("click", () => {
  isOpen = !isOpen;
  if (isOpen) {
    chatPanel.classList.remove("closed");
    toggleBtn.textContent = "✖"; // меняем иконку
  } else {
    chatPanel.classList.add("closed");
    toggleBtn.textContent = "💬";
  }
});

