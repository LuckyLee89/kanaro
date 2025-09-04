// script.js — versão sem ANON KEY (usa Edge Function submit_termo)
document.addEventListener('DOMContentLoaded', () => {
  // ---------------- status + ano ----------------
  const statusEl = document.getElementById('status');
  const setStatus = (msg, ok = true) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700';
  };
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------------- máscaras ----------------
  const cpfInput  = document.querySelector('input[name="cpf"]');
  const rgInput   = document.querySelector('input[name="rg"]');
  const telInput  = document.querySelector('input[name="telefone"]');
  const eTelInput = document.querySelector('input[name="emergencia_telefone"]');

  const cpfMask  = cpfInput  ? IMask(cpfInput,  { mask: '000.000.000-00' }) : null;
  const rgMask   = rgInput   ? IMask(rgInput,   { mask: '00.000.000-A', definitions: { A: /[0-9Xx]/ }, prepare: s => s.toUpperCase() }) : null;
  const telMask  = telInput  ? IMask(telInput,  { mask: '(00) 00000-0000' }) : null;
  const eTelMask = eTelInput ? IMask(eTelInput, { mask: '(00) 00000-0000' }) : null;

  // Helper para setar com máscara (IMask v6/v7)
  const setWithMask = (name, val) => {
    const el = document.querySelector(`[name="${name}"]`);
    if (!el || val === undefined || val === null || val === '') return;
    const v = String(val);

    if (name === 'cpf' && cpfMask)               { cpfMask.unmaskedValue = v.replace(/\D/g, ''); return; }
    if (name === 'telefone' && telMask)          { telMask.unmaskedValue = v.replace(/\D/g, ''); return; }
    if (name === 'emergencia_telefone' && eTelMask){ eTelMask.unmaskedValue = v.replace(/\D/g, ''); return; }
    if (name === 'rg' && rgMask)                 { rgMask.unmaskedValue = v.replace(/[^0-9X]/gi, '').toUpperCase(); return; }
    el.value = v; // sem máscara (email, texto, textarea, date já em yyyy-mm-dd)
  };

 // ---------------- PREFILL (executa cedo) ----------------
let pre = null; // <--- precisa ser visível também no submit
try {
  pre = JSON.parse(sessionStorage.getItem('prefill') || 'null');
  if (pre) {
    setWithMask('cpf', pre.cpf);
    setWithMask('nome', pre.nome);
    setWithMask('rg', pre.rg);
    setWithMask('data_nascimento', pre.data_nascimento);
    setWithMask('email', pre.email);
    setWithMask('telefone', pre.telefone);
    setWithMask('emergencia_nome', pre.emergencia_nome);
    setWithMask('emergencia_telefone', pre.emergencia_telefone);
    setWithMask('condicoes_saude', pre.condicoes_saude);
    setWithMask('medicamentos', pre.medicamentos);
    setWithMask('alergias', pre.alergias);

    // <input type="date"> espera yyyy-mm-dd
    let d = pre.cerimonia_data || '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('/');
      d = `${yyyy}-${mm}-${dd}`;
    }

    // se você está usando o par (display + hidden), mantenha estes:
    const displayEl = document.getElementById('cerimonia_data_display');
    const hiddenEl  = document.getElementById('cerimonia_data');
    if (displayEl) displayEl.value = d;
    if (hiddenEl)  hiddenEl.value = d;

    setWithMask('cerimonia_local', pre.cerimonia_local || '');

    // garante render sincronizado
    cpfMask?.updateValue(); telMask?.updateValue(); eTelMask?.updateValue(); rgMask?.updateValue();
  }
} catch (e) {
  console.warn('Prefill inválido', e);
  pre = null;
}


  // ---------------- elementos do form ----------------
  const form     = document.getElementById('termoForm');
  const btn      = document.getElementById('submitBtn');
  const canvas   = document.getElementById('signature');
  const clearBtn = document.getElementById('clearSig');
  if (!form || !btn || !canvas || !clearBtn) return;

  // ---------------- assinatura (canvas) ----------------
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasSignature = false;

  function sizeCanvasToCSS() {
    canvas.style.display = 'block';
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
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
  function moveDraw(e) { if (!drawing) return; e.preventDefault?.(); const { x, y } = getPos(e); ctx.lineTo(x, y); ctx.stroke(); }
  function endDraw() { drawing = false; setStatus('Assinatura registrada no quadro.'); }

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

  clearBtn.addEventListener('click', () => { sizeCanvasToCSS(); setStatus('Quadro limpo.'); });
  window.addEventListener('resize', sizeCanvasToCSS);
  sizeCanvasToCSS();

  // ---------------- assinatura digitada ----------------
  let sigMode = 'draw';
  const radios     = document.querySelectorAll('input[name="sigMode"]');
  const typedBox   = document.getElementById('typedBox');
  const typedName  = document.getElementById('typedName');
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
    if (document.fonts?.load) document.fonts.load(`${size}px "Pacifico"`).then(drawNow).catch(drawNow);
    else drawNow();
  }
  if (makeSigBtn && typedName) {
    makeSigBtn.addEventListener('click', () => {
      const name = typedName.value.trim();
      if (!name) return alert('Digite seu nome completo.');
      drawTyped(name);
    });
  }

  // ---------------- helpers ----------------
  function formToJSON(el) {
    const fd = new FormData(el);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = v;
    obj.aceitou_termo = !!fd.get('aceitou_termo');
    obj.consentiu_lgpd = !!fd.get('consentiu_lgpd');
    return obj;
  }

  // ---------------- SUBMIT (chama Edge Function) ----------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Validando…');

    if (sigMode === 'type' && typedName && !typedName.value.trim()) {
      setStatus('Digite o nome e clique em "Gerar assinatura".', false);
      return;
    }
    if (!hasSignature) {
      setStatus('Por favor, assine (desenho) ou gere a assinatura digitada.', false);
      return;
    }

    const data = formToJSON(form);
    if (!data.cerimonia_data) { setStatus('Informe a data da cerimônia.', false); return; }
    if (!data.nome || !data.cpf || !data.data_nascimento || !data.email || !data.telefone) {
      setStatus('Preencha os campos obrigatórios (nome, CPF, nascimento, e-mail, telefone).', false);
      return;
    }

    btn.disabled = true;
    setStatus('Enviando…');

    try {
      // 1) PNG base64 da assinatura
      const pngDataUrl = canvas.toDataURL('image/png');

      // 2) normaliza CPF e monta objetos
      const cpfDigits = String(data.cpf).replace(/\D/g, '');
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
      const termo = {
        cerimonia_data: data.cerimonia_data,
        cerimonia_local: data.cerimonia_local || null,
        aceitou_termo: !!data.aceitou_termo,
        consentiu_lgpd: !!data.consentiu_lgpd,
        signature_type: sigMode,
        sig: pre?.sig || null 
      };

      // 3) chama a função
      const FN_SUBMIT = 'https://msroqrlrwtvylxecbmgm.functions.supabase.co/submit_termo';
      const resp = await fetch(FN_SUBMIT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          participante,
          termo,
          assinatura_png_base64: pngDataUrl
        })
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok) throw new Error(j.error || 'Falha ao enviar');

      setStatus('Assinado e enviado com sucesso! Redirecionando…');
      // limpar e redirecionar
      form.reset();
      cpfMask?.updateValue(); telMask?.updateValue(); eTelMask?.updateValue(); rgMask?.updateValue();
      sessionStorage.removeItem('prefill');
      sizeCanvasToCSS();
      setTimeout(() => { window.location.href = 'sucesso.html'; }, 500);

    } catch (err) {
      console.error(err);
      setStatus('Falha ao enviar. Tente novamente.', false);
    } finally {
      btn.disabled = false;
    }
  });
});
