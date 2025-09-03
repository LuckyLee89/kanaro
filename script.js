document.addEventListener('DOMContentLoaded', () => {
  // ==== util (status) ====
// Máscaras
const cpfInput = document.querySelector('input[name="cpf"]');
if (cpfInput) {
  IMask(cpfInput, { mask: '000.000.000-00' });
}

const rgInput = document.querySelector('input[name="rg"]');
if (rgInput) {
  IMask(rgInput, { 
    mask: [
      { mask: '00.000.000-0' },   // só número
      { mask: '00.000.000-A' }    // com letra no final
    ],
    definitions: {
      'A': /[0-9XxAa]/
    }
  });
}

const telInput = document.querySelector('input[name="telefone"]');
if (telInput) {
  IMask(telInput, { mask: '(00) 00000-0000' });
}

const emergTelInput = document.querySelector('input[name="emergencia_telefone"]');
if (emergTelInput) {
  IMask(emergTelInput, { mask: '(00) 00000-0000' });
}

  const statusEl = document.getElementById('status');
  const setStatus = (msg, ok = true) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700';
  };

  // ano no rodapé
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ==== Supabase (inicialização segura) ====
  const SUPABASE_URL = 'https://msroqrlrwtvylxecbmgm.supabase.co';   // <- sua URL
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcm9xcmxyd3R2eWx4ZWNibWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTczNzAsImV4cCI6MjA3MjQ5MzM3MH0.rVcZSuHJAeC505Mra7oecZtK3ovzUhj-nfamFJ7XRhc';    // <- SUA ANON KEY
  const STORAGE_BUCKET = 'assinaturas';
  let supabase = null;
  try {
    const urlOk = /^https?:\/\//.test(SUPABASE_URL) && !/COLOQUE/i.test(SUPABASE_URL);
    const keyOk = SUPABASE_ANON_KEY && !/COLOQUE/i.test(SUPABASE_ANON_KEY);
    if (urlOk && keyOk && window.supabase?.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn('Supabase não configurado (rodando sem backend por enquanto).');
    }
  } catch (e) {
    console.error('Erro ao iniciar Supabase:', e);
    supabase = null;
  }

  // ==== elementos obrigatórios ====
  const form = document.getElementById('termoForm');
  const btn = document.getElementById('submitBtn');
  const canvas = document.getElementById('signature');
  const clearBtn = document.getElementById('clearSig');

  if (!form || !btn || !canvas || !clearBtn) {
    console.error('IDs obrigatórios ausentes (termoForm, submitBtn, signature, clearSig).');
    setStatus('Erro: elementos do formulário não encontrados.', false);
    return;
  }

  // ==== canvas setup ====
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasSignature = false;

  function sizeCanvasToCSS() {
    canvas.style.display = 'block';
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    hasSignature = false;
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : (e.clientX ?? 0);
    const clientY = e.touches ? e.touches[0].clientY : (e.clientY ?? 0);
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function startDraw(e) {
    e.preventDefault?.();
    drawing = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    hasSignature = true;
    setStatus('Desenhando…');
  }
  function moveDraw(e) {
    if (!drawing) return;
    e.preventDefault?.();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function endDraw() {
    drawing = false;
    setStatus('Assinatura registrada no quadro.');
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', startDraw);
  canvas.addEventListener('pointermove', moveDraw);
  canvas.addEventListener('pointerup', endDraw);
  canvas.addEventListener('pointerleave', endDraw);
  canvas.addEventListener('pointercancel', endDraw);
  canvas.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  clearBtn.addEventListener('click', () => {
    sizeCanvasToCSS();
    setStatus('Quadro limpo.');
  });

  window.addEventListener('resize', sizeCanvasToCSS);
  sizeCanvasToCSS();

  // ===== assinatura digitada (opcional) =====
  let sigMode = 'draw';
  const radios = document.querySelectorAll('input[name="sigMode"]');
  const typedBox = document.getElementById('typedBox');
  const typedName = document.getElementById('typedName');
  const makeSigBtn = document.getElementById('makeSigBtn');

  if (radios.length) {
    radios.forEach(r => r.addEventListener('change', () => {
      sigMode = r.value === 'type' ? 'type' : 'draw';
      sizeCanvasToCSS();
      if (typedBox) typedBox.classList.toggle('hidden', sigMode !== 'type');
    }));
  }

  function drawTyped(name) {
    if (!name) return;
    sizeCanvasToCSS();
    const size = Math.max(20, Math.floor(canvas.height * 0.3));
    const fontStack = `"Pacifico", "Allura", cursive`;
    const drawNow = () => {
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${size}px ${fontStack}`;
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
      hasSignature = true;
      setStatus('Assinatura gerada a partir do nome.');
    };
    if (document.fonts?.load) {
      document.fonts.load(`${size}px "Pacifico"`).then(drawNow).catch(drawNow);
    } else drawNow();
  }

  if (makeSigBtn && typedName) {
    makeSigBtn.addEventListener('click', () => {
      const name = typedName.value.trim();
      if (!name) return alert('Digite seu nome completo.');
      drawTyped(name);
    });
  }

  // ===== util submit =====
  function formToJSON(el) {
    const fd = new FormData(el);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = v;
    obj.aceitou_termo = !!fd.get('aceitou_termo');
    obj.consentiu_lgpd = !!fd.get('consentiu_lgpd');
    return obj;
  }
  async function dataURLToBlob(dataURL) {
    const res = await fetch(dataURL);
    return await res.blob();
  }

  // ===== SUBMIT =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Validando…');

    if (!supabase) {
      setStatus('Supabase não configurado. Verifique URL/KEY no script.js.', false);
      return;
    }

    if (sigMode === 'type' && typedName && !typedName.value.trim()) {
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
    setStatus('Enviando…');

    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // upload assinatura
      const pngDataUrl = canvas.toDataURL('image/png');
      const blob = await dataURLToBlob(pngDataUrl);
      const filePath = `${id}.png`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, blob, { contentType: 'image/png', upsert: false });
      if (upErr) throw upErr;

      // insert
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
        signature_type: sigMode,
        signed_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('termos_assinados').insert(payload);
      if (insErr) throw insErr;

      setStatus('Assinado e enviado com sucesso! Obrigado(a).');
      form.reset();
      sizeCanvasToCSS();
      if (typedName) typedName.value = '';
    } catch (err) {
      console.error(err);
      setStatus('Falha ao enviar. Verifique conexão, RLS e policies do Supabase.', false);
    } finally {
      btn.disabled = false;
    }
  });
});
