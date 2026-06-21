// /api/producto.js
//
// Sirve la página de CUALQUIER producto a partir de su slug.
// En vez de tener un .html por producto, hay UNA plantilla aquí y
// los datos (nombre, precio, capturas, FAQ...) viven en Supabase,
// en la tabla "productos".
//
// Por qué servidor y no solo JavaScript en el navegador:
// así Google, y la vista previa de TikTok/WhatsApp cuando comparte el
// enlace, ven el título/descripción/imagen correctos del producto
// directamente, sin tener que ejecutar JS primero.
//
// Configura en vercel.json una reescritura: /productos/:slug -> /api/producto
//
// Variables de entorno necesarias en Vercel:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY   (la pública, de solo lectura — esta función solo lee productos activos)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const slug = (req.query.slug || '').toString();

  if (!slug) {
    return enviarHtml(res, 404, paginaNoEncontrada());
  }

  const { data: producto, error } = await supabase
    .from('productos')
    .select('*')
    .eq('slug', slug)
    .eq('activo', true)
    .single();

  if (error || !producto) {
    return enviarHtml(res, 404, paginaNoEncontrada());
  }

  return enviarHtml(res, 200, paginaProducto(producto));
}

function enviarHtml(res, status, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.status(status).send(html);
}

// ---------- Helpers de contenido ----------

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatoPrecio(precio) {
  return Number(precio).toFixed(2).replace('.', ',') + '&nbsp;€';
}

function renderTrustItems(items = []) {
  const check = '<svg class="trust-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  return items.map(t => `<div class="trust-item">${check}${escapeHtml(t)}</div>`).join('');
}

function renderCapturas(capturas = []) {
  return capturas.map(c => `
  <div class="preview-card"><img src="${escapeHtml(c.url)}" alt="${escapeHtml(c.alt || c.caption || '')}" loading="lazy"></div>
  <p class="preview-caption">${escapeHtml(c.caption || '')}</p>`).join('');
}

function renderCaracteristicas(items = []) {
  const checkSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  return items.map(f => `
    <div class="feat-item">
      <div class="feat-check">${checkSvg}</div>
      <div class="feat-text"><strong>${escapeHtml(f.titulo)}</strong><span>${escapeHtml(f.descripcion)}</span></div>
    </div>`).join('');
}

function renderPasos(pasos = []) {
  return pasos.map(p => `
    <div class="how-step">
      <div class="step-num">${escapeHtml(p.numero)}</div>
      <div class="step-title">${escapeHtml(p.titulo)}</div>
      <div class="step-desc">${escapeHtml(p.descripcion)}</div>
    </div>`).join('');
}

function renderFaqs(faqs = []) {
  return faqs.map(f => `
  <div class="faq-item">
    <div class="faq-q">${escapeHtml(f.pregunta)}</div>
    <div class="faq-a">${escapeHtml(f.respuesta)}</div>
  </div>`).join('');
}

// ---------- Páginas ----------

function paginaNoEncontrada() {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Producto no encontrado | gestio.com.es</title><meta name="robots" content="noindex">
<style>body{font-family:sans-serif;background:#0D1117;color:#E6EDF3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px;}
a{color:#6EE7B7;text-decoration:none;font-weight:600;}</style></head>
<body><div><h2>No encontramos este producto</h2><p><a href="/">Volver a gestio.com.es</a></p></div></body></html>`;
}

function paginaProducto(p) {
  const url = `https://gestio.com.es/productos/${p.slug}`;
  const imagenOg = (p.capturas && p.capturas[0] && p.capturas[0].url) || '';
  const titulo = `${p.nombre} — Plantilla Excel | gestio.com.es`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(titulo)}</title>
<meta name="description" content="${escapeHtml(p.meta_description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${escapeHtml(p.nombre)}">
<meta property="og:description" content="${escapeHtml(p.meta_description)}">
${imagenOg ? `<meta property="og:image" content="${escapeHtml(imagenOg)}">` : ''}
<meta property="og:locale" content="es_ES">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@800&display=swap" rel="stylesheet">
<style>
:root {
  --navy:#0F1B2D; --navy-2:#1A2E48; --emerald:#059669; --em-light:#D1FAE5; --em-mid:#6EE7B7; --em-glow:rgba(5,150,105,0.18);
  --slate:#64748B; --slate-2:#94A3B8; --slate-3:#CBD5E1; --bg:#0D1117; --bg-2:#161B22; --bg-3:#1C2128; --ink:#E6EDF3;
  --line:rgba(255,255,255,0.08); --line-em:rgba(5,150,105,0.25); --card-bg:#161B22; --nav-bg:rgba(13,17,23,0.92); --white:#ffffff; --amber:#F59E0B;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--ink);overflow-x:hidden;font-size:15px;line-height:1.6;}
.grid-bg{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 80% 50% at 50% 0%,black 30%,transparent 100%);}
nav{position:fixed;top:0;left:0;right:0;z-index:100;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:var(--nav-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line);}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:-0.5px;}
.logo-icon{position:relative;width:28px;height:28px;flex-shrink:0;}
.logo-g{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:13px;color:#1aff8c;text-shadow:0 0 10px rgba(26,255,140,.8),0 0 25px rgba(26,255,140,.35);}
.nav-links{display:flex;gap:6px;align-items:center;}
.nav-pro-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:var(--em-glow);border:1px solid var(--line-em);border-radius:20px;font-size:13px;font-weight:600;color:var(--em-mid);text-decoration:none;white-space:nowrap;}
.nav-back{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:20px;font-size:13.5px;font-weight:500;color:var(--slate-2);text-decoration:none;}
@media (max-width:480px){nav{padding:0 16px;}.logo{font-size:14px;gap:6px;}.logo-icon{width:22px;height:22px;}.nav-pro-badge{display:none;}}
.hero{position:relative;z-index:1;padding:120px 24px 56px;max-width:1100px;margin:0 auto;text-align:center;}
.product-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 16px;background:var(--em-glow);border:1px solid var(--line-em);border-radius:20px;font-size:12.5px;font-weight:700;color:var(--em-mid);letter-spacing:.5px;text-transform:uppercase;margin-bottom:24px;}
.eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--em-mid);}
h1{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(32px,6vw,52px);font-weight:700;line-height:1.08;letter-spacing:-1px;margin-bottom:18px;}
h1 em{font-style:normal;color:var(--em-mid);}
.hero p.lead{max-width:620px;margin:0 auto 32px;color:var(--slate-2);font-size:17px;}
.price-card{max-width:380px;margin:0 auto 28px;background:var(--card-bg);border:1px solid var(--line);border-radius:18px;padding:28px 28px 24px;}
.price-row{display:flex;align-items:baseline;justify-content:center;gap:10px;margin-bottom:6px;}
.price-now{font-family:'Bricolage Grotesque',sans-serif;font-size:44px;font-weight:800;color:var(--ink);}
.price-note{color:var(--slate-2);font-size:13px;margin-bottom:18px;}
.btn-buy{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:16px 24px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:12px;font-weight:700;font-size:16px;text-decoration:none;box-shadow:0 8px 24px rgba(5,150,105,.35);}
.price-secure{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;font-size:12.5px;color:var(--slate-2);}
.trust-strip{display:flex;flex-wrap:wrap;justify-content:center;gap:28px;max-width:1000px;margin:0 auto 64px;padding:0 24px 40px;border-bottom:1px solid var(--line);}
.trust-item{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--slate-2);}
.trust-icon{color:var(--em-mid);flex-shrink:0;}
.section{max-width:1000px;margin:0 auto;padding:64px 24px;}
.section-label{font-size:12.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--em-mid);margin-bottom:10px;text-align:center;}
.section-title{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(24px,4vw,34px);font-weight:700;text-align:center;margin-bottom:36px;letter-spacing:-.5px;}
.preview-card{background:var(--card-bg);border:1px solid var(--line);border-radius:16px;padding:10px;margin-bottom:28px;overflow:hidden;}
.preview-card img{width:100%;display:block;border-radius:10px;}
.preview-caption{text-align:center;font-size:13.5px;color:var(--slate-2);margin-top:14px;margin-bottom:36px;}
.feat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:8px;}
@media (max-width:680px){.feat-grid{grid-template-columns:1fr;}}
.feat-item{display:flex;gap:12px;background:var(--card-bg);border:1px solid var(--line);border-radius:14px;padding:18px;}
.feat-check{width:24px;height:24px;flex-shrink:0;border-radius:50%;background:var(--em-glow);color:var(--em-mid);display:flex;align-items:center;justify-content:center;}
.feat-text strong{display:block;font-size:14.5px;margin-bottom:3px;}
.feat-text span{font-size:13.5px;color:var(--slate-2);}
.how-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:8px;}
@media (max-width:780px){.how-steps{grid-template-columns:1fr;}}
.how-step{background:var(--card-bg);border:1px solid var(--line);border-radius:14px;padding:22px;}
.step-num{font-size:12.5px;font-weight:700;color:var(--em-mid);letter-spacing:.5px;margin-bottom:10px;}
.step-title{font-weight:700;font-size:15.5px;margin-bottom:6px;}
.step-desc{font-size:13.5px;color:var(--slate-2);}
.faq-item{border-bottom:1px solid var(--line);padding:18px 0;}
.faq-q{font-weight:700;font-size:15px;margin-bottom:6px;}
.faq-a{font-size:14px;color:var(--slate-2);}
.bottom-cta-section{max-width:760px;margin:0 auto;padding:56px 24px 90px;text-align:center;}
.cta-title{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(22px,4vw,30px);font-weight:700;margin-bottom:14px;}
.cta-sub{color:var(--slate-2);font-size:14.5px;margin-bottom:24px;max-width:480px;margin-left:auto;margin-right:auto;}
.btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;background:transparent;color:var(--slate-2);border:1.5px solid var(--line);border-radius:12px;font-size:14.5px;font-weight:500;text-decoration:none;}
footer{text-align:center;padding:28px 24px 40px;color:var(--slate);font-size:12.5px;border-top:1px solid var(--line);}
footer a{color:var(--slate);text-decoration:underline;}
</style>
</head>
<body>
<div class="grid-bg"></div>
<nav>
  <a href="/index.html" class="logo">
    <div class="logo-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="none" stroke="#1A2E48" stroke-width="1.5"/></svg><div class="logo-g">G</div></div>
    <span>Gest<span style="color:#1aff8c;">io</span></span>
  </a>
  <div class="nav-links">
    <a href="/index.html" class="nav-back">← Herramientas gratis</a>
    <a href="/pro.html" class="nav-pro-badge">Gestio PRO</a>
  </div>
</nav>

<section class="hero">
  <div class="product-eyebrow"><span class="eyebrow-dot"></span>${escapeHtml(p.badge)}</div>
  <h1>${p.nombre_html || escapeHtml(p.nombre)}</h1>
  <p class="lead">${escapeHtml(p.tagline)}</p>

  <div class="price-card">
    <div class="price-row"><span class="price-now">${formatoPrecio(p.precio)}</span></div>
    <div class="price-note">${escapeHtml(p.precio_nota)}</div>
    <a href="${escapeHtml(p.payment_link)}" class="btn-buy">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      Comprar ahora
    </a>
    <div class="price-secure">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      Pago seguro con tarjeta · Descarga inmediata al confirmarse el pago
    </div>
  </div>
</section>

<div class="trust-strip">${renderTrustItems(p.trust_items)}</div>

<section class="section">
  <div class="section-label">Vista previa</div>
  <h2 class="section-title">Así de claro se ve tu negocio</h2>
  ${renderCapturas(p.capturas)}
</section>

<section class="section">
  <div class="section-label">Qué incluye</div>
  <h2 class="section-title">Todo lo que necesitas, en un archivo</h2>
  <div class="feat-grid">${renderCaracteristicas(p.caracteristicas)}</div>
</section>

<section class="section">
  <div class="section-label">Cómo funciona</div>
  <h2 class="section-title">De pagar a usarlo, en un día</h2>
  <div class="how-steps">${renderPasos(p.pasos)}</div>
</section>

<section class="section">
  <div class="section-label">Preguntas frecuentes</div>
  <h2 class="section-title">Antes de comprar</h2>
  ${renderFaqs(p.faqs)}
</section>

<section class="bottom-cta-section">
  <div class="cta-title">¿Necesitas algo más a medida?</div>
  <p class="cta-sub">Si tu negocio necesita un control distinto, más avanzado o conectado a tu propia web, lo hacemos a medida en Gestio PRO.</p>
  <a href="/pro.html" class="btn-ghost">Ver servicios a medida
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
  </a>
</section>

<footer>
  <p>© 2026 gestio.com.es — Herramientas para autónomos y pymes &nbsp;·&nbsp; <a href="/aviso-legal.html">Aviso legal</a> &nbsp;·&nbsp; <a href="/privacidad.html">Privacidad</a></p>
</footer>
</body>
</html>`;
}
