// ===== Assinatura (Canvas) =====
const canvas = document.getElementById('signature');
const ctx = canvas.getContext('2d');
let drawing = false;
let hasSignature = false;

function resizeCanvas() {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w;
  canvas.height = h;
  clearSignature();
}

function clearSignature() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  hasSignature = false;
}

canvas.style.touchAction = 'none';

canvas.addEventListener('pointerdown', (e) => {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
  canvas.setPointerCapture?.(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  hasSignature = true;
});

['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
  canvas.addEventListener(ev, (e) => {
    drawing = false;
    canvas.releasePointerCapture?.(e.pointerId);
  })
);

document.getElementById('clearSig').addEventListener('click', clearSignature);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.__hasSignature = () => hasSignature;

// ===== SUBMISSÃO (ajuste para validar assinatura) =====
const form = document.getElementById('termoForm');
const btn = document.getElementById('submitBtn');
function setStatus(msg, ok = true) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!__hasSignature()) {
    setStatus('Por favor, assine no quadro antes de enviar.', false);
    return;
  }
  setStatus('Formulário capturado (teste).');
  btn.disabled = true;
  setTimeout(() => {
    btn.disabled = false;
    clearSignature();
    form.reset();
    setStatus('Assinatura registrada localmente.');
  }, 1000);
});
