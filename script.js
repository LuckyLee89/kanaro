// ============== BOOT SEGURO ==============
document.addEventListener('DOMContentLoaded', () => {
  // ano no rodapé (se existir)
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== CONFIG SUPABASE =====
  const SUPABASE_URL = 'COLOQUE_AQUI_SUA_SUPABASE_URL';
  const SUPABASE_ANON_KEY = 'COLOQUE_AQUI_SUA_SUPABASE_ANON_KEY';
  const STORAGE_BUCKET = 'assinaturas';

  const supabase =
    window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY) || null;

  // ===== ELEMENTOS OBRIGATÓRIOS =====
  const form = document.getElementById('termoForm');
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('submitBtn');
  const canvas = document.getElementById('signature');
  const clearBtn = document.getElementById('clearSig');

  if (!form || !canvas || !btn || !statusEl || !clearBtn) {
    console.error('IDs obrigatórios não encontrados no HTML.');
    return;
  }

  // ===== CANVAS =====
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasSignature = false;

  function setStatus(msg, ok = true) {
    statusEl.textContent = msg;
    statusEl.className = ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700';
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

  function resizeCanvas() {
    const w = canvas.offsetWidth || canvas.clientWidth || 800;
    const h = canvas.offsetHeight || canvas.clientHeight || 200;
    canvas.width = w;
    canvas.height = h;
    clearSignature();
  }

  canvas.style.touchAction = 'none';
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ===== MODO: DESENHAR / DIGITAR =====
  // Esses elementos são opcionais. Se não existirem, ficamos no modo "draw".
  let sigMode = 'draw';
  const modeRadios = document.querySelectorAll('input[name="sigMode"]');
  const typedBox = document.getElementById('typedBox') || null;
  const typedName = document.getElementById('typedName') || null;
  const makeSigBtn = document.getElementById('makeSigBtn') || null;

  function drawTypedSignature(name) {
    if (!name) return;
    // fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const size = Math.max(24, Math.floor(canvas.height * 0.5));
    const fontStack = `"Pacifico", "Allura", cursive`;
    const drawNow = () => {
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${size}px ${fontStack}`;
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
      hasSignature = true;
    };
    if (document.fonts?.load) {
      document.fonts.load(`${size}px "Pacifico"`).then(drawNow).catch(drawNow);
    } else {
      drawNow();
    }
  }

  // ativa/desativa modo se existirem os radios
  if (modeRadios.length) {
    modeRadios.forEach(r => {
      r.addEventListener('change', () => {
        sigMode = r.value === 'type' ? 'type' : 'draw';
        clearSignature();
        if (typedBox) typedBox.classList.toggle('hidden', sigMode !== 'type');
      });
    });
  }

  if (makeSigBtn && typedName) {
    makeSigBtn.addEventListener('click', () => {
      const name = typedName.value.trim();
      if (!name) {
        alert('Digite seu nome completo.');
        return;
      }
      drawTypedSignature(name);
    });
  }

  // ===== Desenho livre (sempre disponível) =====
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

  clearBtn.addEventListener('click', clearSignature);

  // ===== UTIL =====
  async function dataURLToBlob(dataURL) {
    const res = await fetch(dataURL);
    return await res.blob();
  }
  function formToJSON(formEl) {
    const fd = new FormData(formEl);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = v;
    obj.aceitou_termo = !!fd.get('aceitou_termo');
    obj.consentiu_lgpd = !!fd.get('consentiu_lgpd');
    return obj;
  }

  // ===== SUBMISSÃO =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Validando…');

    if (!supabase) {
      setStatus('Supabase não configurado. Verifique URL/KEY.', false);
      return;
    }

    // Se modo type existir e estiver ativo, exigir nome + gerar no canvas se ainda não gerou
    if (sigMode === 'type' && typedName) {
      const name = typedName.value.trim();
      if (!name) {
        setStatus('Digite o nome e clique em "Gerar assinatura".', false);
        return;
      }
      if (!hasSignature) drawTypedSignature(name);
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
        .from('assinaturas')
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
        signature_type: (sigMode === 'type' ? 'type' : 'draw'),
        signed_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('termos_assinados').insert(payload);
      if (insErr) throw insErr;

      setStatus('Assinado e enviado com sucesso! Obrigado(a).');
      form.reset();
      clearSignature();
      if (typedName) typedName.value = '';
    } catch (err) {
      console.error(err);
      setStatus('Falha ao enviar. Verifique conexão, RLS e policies do Supabase.', false);
    } finally {
      btn.disabled = false;
    }
  });
});
