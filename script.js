// ===== Configs gerais =====
document.getElementById('year').textContent = new Date().getFullYear();

const SUPABASE_URL = 'COLOQUE_AQUI_SUA_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'COLOQUE_AQUI_SUA_SUPABASE_ANON_KEY';
const STORAGE_BUCKET = 'assinaturas';

const supabase = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Canvas de assinatura =====
const canvas = document.getElementById('signature');
const ctx = canvas.getContext('2d');
let drawing = false;
let hasSignature = false;

// NOVO: modo de assinatura (draw | type)
let sigMode = 'draw';
const modeRadios = document.querySelectorAll('input[name="sigMode"]');
const typedBox = document.getElementById('typedBox');
const typedName = document.getElementById('typedName');
const makeSigBtn = document.getElementById('makeSigBtn');

function resizeCanvas() {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w;
  canvas.height = h;
  // se for modo "type", regenerar texto para ajustar ao novo tamanho
  if (sigMode === 'type' && typedName.value.trim()) {
    drawTypedSignature(typedName.value.trim());
  } else {
    clearSignature();
  }
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

canvas.style.touchAction = 'none'; // não rolar durante desenho

// Eventos para desenhar (modo draw)
canvas.addEventListener('pointerdown', (e) => {
  if (sigMode !== 'draw') return;
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (sigMode !== 'draw' || !drawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  hasSignature = true;
});
['pointerup','pointerleave','pointercancel'].forEach(ev => {
  canvas.addEventListener(ev, (e) => {
    if (sigMode !== 'draw') return;
    drawing = false;
    canvas.releasePointerCapture?.(e.pointerId);
  });
});

document.getElementById('clearSig').addEventListener('click', clearSignature);
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== NOVO: assinatura digitada =====
function drawTypedSignature(name) {
  // fundo branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // tenta carregar as fontes e depois desenha
  const size = Math.max(24, Math.floor(canvas.height * 0.5));
  const fontStack = `"Pacifico", "Allura", cursive`;
  // garante que a fonte web foi carregada
  if (document.fonts && document.fonts.load) {
    document.fonts.load(`${size}px "Pacifico"`).then(() => {
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${size}px ${fontStack}`;
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
      hasSignature = true;
    });
  } else {
    // fallback
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px ${fontStack}`;
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    hasSignature = true;
  }
}

// alternar modo
modeRadios.forEach(r => {
  r.addEventListener('change', () => {
    sigMode = r.value;
    clearSignature();
    // mostra/esconde caixa de digitação
    typedBox.classList.toggle('hidden', sigMode !== 'type');
  });
});

// gerar assinatura a partir do nome
if (makeSigBtn) {
  makeSigBtn.addEventListener('click', () => {
    const name = (typedName.value || '').trim();
    if (!name) return alert('Digite seu nome completo.');
    drawTypedSignature(name);
  });
}

// ===== Utilidades =====
async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return await res.blob();
}
function setStatus(msg, ok = true) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700';
}
function formToJSON(form) {
  const fd = new FormData(form);
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  obj.aceitou_termo = !!fd.get('aceitou_termo');
  obj.consentiu_lgpd = !!fd.get('consentiu_lgpd');
  return obj;
}

// ===== SUBMISSÃO =====
const form = document.getElementById('termoForm');
const btn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('Validando…');

  if (!supabase) {
    setStatus('Supabase não configurado. Verifique URL/KEY.', false);
    return;
  }

  if (sigMode === 'type' && !typedName.value.trim()) {
    setStatus('Digite o nome e clique em "Gerar assinatura".', false);
    return;
  }
  if (!hasSignature) {
    setStatus('Por favor, assine (desenho) ou gere a assinatura digitada.', false);
    return;
  }

  const data = formToJSON(form);
  if (!data.nome || !data.cpf || !data.data_nascimento || !data.email || !data.telefone) {
    setStatus('Preencha os campos obrigatórios (nome, CPF, nascimento, e-mail, telefone).', false);
    return;
  }

  btn.disabled = true;
  setStatus('Enviando… aguarde.');

  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // 1) Upload da assinatura (PNG) no Storage
    const pngDataUrl = canvas.toDataURL('image/png');
    const blob = await dataURLToBlob(pngDataUrl);
    const filePath = `${id}.png`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, { contentType: 'image/png', upsert: false });
    if (upErr) throw upErr;

    // 2) Insert na tabela
    const payload = {
      id,
      nome: data.nome,
      cpf: data.cpf,
      rg: data.rg || null,
      data_nascimento: data.data_nascimento || null,
      email: data.email,
      telefone: data.telefone,
      emergencia_nome: data.emergencia_nome || null,
      emergencia_telefone: data.emergencia_telefone || null,
      condicoes_saude: data.condicoes_saude || null,
      medicamentos: data.medicamentos || null,
      alergias: data.alergias || null,
      cerimonia_data: data.cerimonia_data || null,
      cerimonia_local: data.cerimonia_local || null,
      aceitou_termo: !!data.aceitou_termo,
      consentiu_lgpd: !!data.consentiu_lgpd,
      assinatura_url: filePath,
      // NOVO: ajuda na auditoria
      signature_type: sigMode,
      signed_at: new Date().toISOString()
    };

    const { error: insErr } = await supabase.from('termos_assinados').insert(payload);
    if (insErr) throw insErr;

    setStatus('Assinado e enviado com sucesso! Obrigado(a).');
    form.reset();
    typedName.value = '';
    clearSignature();
  } catch (err) {
    console.error(err);
    setStatus('Falha ao enviar. Verifique conexão, RLS e policies do Supabase.', false);
  } finally {
    btn.disabled = false;
  }
});
