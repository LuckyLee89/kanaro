document.addEventListener('DOMContentLoaded', () => {
  // ================= util/status =================
  const statusEl = document.getElementById('status');
  const setStatus = (msg, ok = true) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700';
  };

  // ano no rodapé
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ================= máscaras =================
  const cpfInput = document.querySelector('input[name="cpf"]');
  if (cpfInput) IMask(cpfInput, { mask: '000.000.000-00' });

  const rgInput = document.querySelector('input[name="rg"]');
  if (rgInput) {
    if (rgInput._imask) rgInput._imask.destroy();
    IMask(rgInput, {
      mask: '00.000.000-A',
      definitions: { 'A': /[0-9Xx]/ },
      prepare: s => s.toUpperCase()
    });
  }

  const telInput = document.querySelector('input[name="telefone"]');
  if (telInput) IMask(telInput, { mask: '(00) 00000-0000' });

  const emergTelInput = document.querySelector('input[name="emergencia_telefone"]');
  if (emergTelInput) IMask(emergTelInput, { mask: '(00) 00000-0000' });

  // ================= Supabase =================
  const SUPABASE_URL = 'https://msroqrlrwtvylxecbmgm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcm9xcmxyd3R2eWx4ZWNibWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTczNzAsImV4cCI6MjA3MjQ5MzM3MH0.rVcZSuHJAeC505Mra7oecZtK3ovzUhj-nfamFJ7XRhc';
  const STORAGE_BUCKET = 'assinaturas';
  let supabase = null;
  try {
    if (window.supabase?.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn('Supabase SDK não disponível no window.');
    }
  } catch (e) {
    console.error('Erro ao iniciar Supabase:', e);
    supabase = null;
  }

  // ================= elementos do form =================
  const form   = document.getElementById('termoForm');
  const btn    = document.getElementById('submitBtn');
  const canvas = document.getElementById('signature');
  const clearBtn = document.getElementById('clearSig');

  const cpfField = document.querySelector('[name="cpf"]');
  if (pre?.cpf && cpfField) {
    cpfField.value = pre.cpf;
    cpfField.readOnly = true;
    cpfField.classList.add('bg-gray-100');
  }

  // se não for a página do termo, sai
  if (!form || !btn || !canvas || !clearBtn) return;

  // ================= PREFILL do início =================
  try {
    const pre = JSON.parse(sessionStorage.getItem('prefill') || 'null');
    if (pre) {
      const set = (name, val) => {
        const el = document.querySelector(`[name="${name}"]`);
        if (el && (val || val === 0)) el.value = val;
      };
      set('cpf', pre.cpf);
      set('nome', pre.nome);
      set('rg', pre.rg);
      set('data_nascimento', pre.data_nascimento); // YYYY-MM-DD
      set('email', pre.email);
      set('telefone', pre.telefone);
      set('emergencia_nome', pre.emergencia_nome);
      set('emergencia_telefone', pre.emergencia_telefone);
      set('condicoes_saude', pre.condicoes_saude);
      set('medicamentos', pre.medicamentos);
      set('alergias', pre.alergias);
      // MUITO IMPORTANTE: data/local da cerimônia vindos do início
      set('cerimonia_data', pre.cerimonia_data);
      set('cerimonia_local', pre.cerimonia_local || '');
      console.log('Prefill aplicado:', pre);
    }
  } catch (e) {
    console.warn('Prefill falhou', e);
  }

  // ================= assinatura (canvas) =================
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

  // ===== assinatura digitada =====
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
    const size = Math.max(20, Math.floor(canvas.height * 0.3)); // menor
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

  // ================= helpers =================
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

  // ================= SUBMIT =================
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
    // CERIMÔNIA é obrigatória, pois o termo vale só para a data
    if (!data.cerimonia_data) {
      setStatus('Informe a data da cerimônia.', false);
      return;
    }
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

      // normaliza CPF para só dígitos
      const cpfDigits = String(data.cpf).replace(/\D/g, '');
      
      // upsert no participantes (se já existir CPF, atualiza)
      const participante = {
        cpf: cpfDigits,
        nome: data.nome,
        rg: data.rg || null,
        data_nascimento: data.data_nascimento || null,
        email: data.email,
        telefone: data.telefone,
        emergencia_nome: data.emergencia_nome || null,
        emergencia_telefone: data.emergencia_telefone || null,
        condicoes_saude: data.condicoes_saude || null,
        medicamentos: data.medicamentos || null,
        alergias: data.alergias || null
      };
      
      const { error: upErr } = await supabase
        .from('participantes')
        .upsert(participante, { onConflict: ['cpf'] });
      
      if (upErr) throw upErr;
      

      // insert no termos_assinados
      const payload = {
        id,
        nome: data.nome,
        cpf: cpfDigits,
        rg: data.rg || null,
        data_nascimento: data.data_nascimento || null,
        email: data.email,
        telefone: data.telefone,
        emergencia_nome: data.emergencia_nome || null,
        emergencia_telefone: data.emergencia_telefone || null,
        condicoes_saude: data.condicoes_saude || null,
        medicamentos: data.medicamentos || null,
        alergias: data.alergias || null,
        cerimonia_data: data.cerimonia_data || null, // <- chave do termo
        cerimonia_local: data.cerimonia_local || null,
        aceitou_termo: !!data.aceitou_termo,
        consentiu_lgpd: !!data.consentiu_lgpd,
        assinatura_url: filePath,
        signature_type: sigMode,
        signed_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('termos_assinados').insert(payload);
      if (insErr) throw insErr;

      setStatus('Assinado e enviado com sucesso! Redirecionando…');

      // limpa e redireciona
      form.reset();
      sessionStorage.removeItem('prefill');
      sizeCanvasToCSS();

      setTimeout(() => {
        window.location.href = 'sucesso.html';
      }, 500);
    } catch (err) {
      console.error(err);
      setStatus('Falha ao enviar. Verifique conexão, RLS e policies do Supabase.', false);
    } finally {
      btn.disabled = false;
    }
  });
});
